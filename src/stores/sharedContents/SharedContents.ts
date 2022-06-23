import {MessageType} from '@models/api/DataMessageType'
import {extractSharedContentInfo, isContentWallpaper, ISharedContent, SharedContentInfo, WallpaperStore} from '@models/ISharedContent'
import {PARTICIPANT_SIZE} from '@models/Participant'
import {diffMap, intersectionMap, Roles, TrackKind} from '@models/utils'
import {assert} from '@models/utils'
import {getRect, isCircleInRect} from '@models/utils'
import {default as participantsStore} from '@stores/participants/Participants'
import participants from '@stores/participants/Participants'
import {EventEmitter} from 'events'
import _ from 'lodash'
import {action, autorun, computed, IObservableArray, makeObservable, observable} from 'mobx'
import {createContent, extractContentDatas, moveContentToTop} from './SharedContentCreator'
import { conference } from '@models/api'

export const CONTENTLOG = false      // show manipulations and sharing of content
export const contentLog = CONTENTLOG ? console.log : (a:any) => {}
export const contentDebug = CONTENTLOG ? console.debug : (a:any) => {}

export const TITLE_HEIGHT = 24

// config.js
declare const config:any             //  from ../../config.js included from index.html

function zorderComp(a:ISharedContent, b:ISharedContent) {
  return a.zorder - b.zorder
}

export class SharedContents extends EventEmitter {
  private contentIdCounter = 0
  private localId = ''
  constructor() {
    super()
    makeObservable(this)
    autorun(() => { //  sync localId to participantsStore
      const newLocalId = participantsStore.localId
      Array.from(this.owner.keys()).forEach((key) => {
        if (this.owner.get(key) === this.localId) {
          this.owner.set(key, newLocalId)
        }
      })
      this.localId = newLocalId
      contentLog(`Set new local id ${this.localId}`)
    })
    const fps = localStorage.getItem('screenFps')
    if (fps){ this.screenFps = JSON.parse(fps) }
    autorun(() => { //  save screen Fps
      localStorage.setItem('screenFps', JSON.stringify(this.screenFps))
    })
    autorun(() => { //  update audio zone of the local participant
      const pos = participants.local.pose.position
      participants.local.zone = this.zones.find(c => isCircleInRect(pos, 0.5*PARTICIPANT_SIZE, getRect(c.pose, c.size)))
      //  console.log(`sc autorun local zone:${participants.local.zone?.id}`)
    })
    autorun(() => { //  update closed audio zones of remote participants
      const closeds = this.closedZones.map(c => ({content:c, rect:getRect(c.pose, c.size)}))
      participants.remote.forEach(r => {
        if (!r.muteAudio && r.physics.located){
          const found = closeds.find(c => isCircleInRect(r.pose.position, 0.5*PARTICIPANT_SIZE, c.rect))
          r.closedZone = found?.content
        }else{
          r.closedZone = undefined
        }
      })
    })
  }
  @action setEditing(id: string){
    if (id !== this.editing && this.beforeChangeEditing){
      this.beforeChangeEditing(this.editing, id)
    }
    this.editing = id
  }
  private beforeChangeEditing?: (cur:string, next:string) => void = undefined
  public setBeforeChangeEditing(callback?: (cur:string, next:string)=>void, id?:string){
    if (!id || id === this.editing){
      this.beforeChangeEditing = callback
    }
  }

  // -----------------------------------------------------------------
  //  Contents
  //  All shared contents in Z order. Observed by component.
  @observable pasteEnabled = true
  @observable editing = ''                        //  the user editing content
  @observable.shallow all: ISharedContent[] = []  //  all contents to display
  sorted: ISharedContent[] = []                   //  all contents sorted by zorder (bottom to top)
  @observable.shallow zones: ISharedContent[] = []        //  audio zones sorted by zorder (top to bottom)
  @observable.shallow closedZones: ISharedContent[] = []  //  closed audio zones sorted by zorder (top to bottom)
  //  Contents by room  used only when a relay server exsits.
  @observable.shallow roomContents = new Map<string, ISharedContent>()
  //  Contents info     used only when a relay server exsits.
  @observable.shallow roomContentsInfo = new Map<string, SharedContentInfo>()
  //  Contents for playback.
  @observable.shallow playbackContents = new Map<string, ISharedContent>()

  //  Tracks
  @observable.ref mainScreenStream?: MediaStream
  @observable mainScreenOwner: string | undefined
  @observable.deep contentTracks = new Map<string, MediaStreamTrack[]>()  //  cid -> stream
  private getOrCreateContentTrack(cid: string): MediaStreamTrack[]{
    if(!this.contentTracks.has(cid)){
      this.contentTracks.set(cid, [])
    }
    return this.contentTracks.get(cid)!
  }

  public addRemoteTrack(peer: string, role: Roles, track: MediaStreamTrack){
    if (role === 'mainScreen'){
      const ms = new MediaStream()
      ms.addTrack(track)
      if (this.mainScreenOwner !== peer){
        this.mainScreenOwner = peer
        this.mainScreenStream = ms
      }else{
        this.mainScreenStream?.getTracks().forEach(track => {
          ms.addTrack(track)
        })
        this.mainScreenStream = ms
      }
    }else{
      const tracks = this.getOrCreateContentTrack(role)
      tracks.push(track)
    }
  }
  public removeRemoteTrack(peer: string, role: Roles, kind: TrackKind){
    if (role === 'mainScreen'){
      if (this.mainScreenOwner === peer){
        const ms = new MediaStream()
        if (kind === 'audio'){
          this.mainScreenStream?.getVideoTracks().forEach(ms.addTrack)
        }else{
          this.mainScreenStream?.getAudioTracks().forEach(ms.addTrack)
        }
        if (ms.getTracks().length){
          this.mainScreenStream = ms
        }else{
          this.mainScreenStream = undefined
        }
        this.mainScreenOwner = undefined
      }
    }else{
      const tracks = this.contentTracks.get(role)
      if (tracks){
        const i = tracks.findIndex(t=>t.kind === kind)
        if (i>=0){
          tracks[i].stop()
          tracks.splice(i, 1)
        }
      }else{
        console.error(`removeRemoteTrack(): tracks for content ${role} not found.`)
      }
    }
  }
  public getAllRtcContents(){
    return this.all.filter(c => c.type === 'screen' || c.type === 'camera')
  }
  public getLocalRtcContents(){
    return this.getAllRtcContents().filter(c => this.owner.get(c.id) === this.localId)
  }
  public getRemoteRtcContents(){
    return this.getAllRtcContents().filter(c => this.owner.get(c.id) !== this.localId)
  }

  //  pasted content
  @observable.ref pasted:ISharedContent = createContent()
  @action setPasted(c:ISharedContent) {
    console.log('setPasted:', c)
    this.pasted = c
  }
  @action sharePasted() {
    this.shareContent(this.pasted)
    this.pasted = createContent()
  }
  //  share content
  @action shareContent(content:ISharedContent) {
    moveContentToTop(content)
    this.addLocalContent(content)
  }

  @action updatePlayback(content: ISharedContent){
    content.playback = true
    this.playbackContents.set(content.id, content)
    this.updateAll()
  }
  @action removePlayback(cid: string){
    this.playbackContents.delete(cid)
    this.updateAll()
  }
  findPlayback(cid: string){
    return this.playbackContents.get(cid)
  }

  //  Map<cid, pid>, map from contentId to participantId
  owner: Map<string, string> = new Map<string, string>()

  public find(cid: string) {
    return this.roomContents.get(cid)
  }

  private updateAll() {
    const newAll:ISharedContent[] = []
    Object.assign(newAll, Array.from(this.roomContents.values()))
    newAll.push(...Array.from(this.playbackContents.values()))

    const newSorted = Array.from(newAll).sort(zorderComp)
    newSorted.forEach((c, idx) => {c.zIndex = idx+1})

    //  update observed values
    this.all = newAll
    this.sorted = newSorted
    this.zones = this.sorted.filter(c => c.zone !== undefined).reverse()
    this.closedZones = this.zones.filter(c => c.zone === 'close')
  }

  //  wallpaper contents
  wallpapers = ''
  private getWallpaper() {
    let nWallpapers = this.sorted.findIndex((c) => !isContentWallpaper(c))
    if (nWallpapers < 0) { nWallpapers = this.sorted.length }

    return this.sorted.slice(0, nWallpapers)
  }

  //  add
  addLocalContent(c:ISharedContent) {
    if (!c.id) { c.id = this.getUniqueId() }
    this.updateByLocal(c)
  }

  //  Temporaly update local only no sync with other participant.
  //  This makes non-detectable inconsistency and must call updateByLocal() soon later.
  updateLocalOnly(newContent: ISharedContent){
    this.roomContents.set(newContent.id, newContent)
    this.updateAll()
  }
  //  updated by local user
  updateByLocal(newContent: ISharedContent) {
    this.roomContents.set(newContent.id, newContent)
    conference.dataConnection.sync.sendContentUpdateRequest('', [newContent])
    this.updateAll()
    this.roomContentsInfo.set(newContent.id, newContent)
  }

  //  removed by local user
  removeByLocal(cid: string) {
    const toRemove = this.roomContents.get(cid)
    if (toRemove){
      this.disposeContent(toRemove)
      this.roomContents.delete(cid)
    }
    conference.dataConnection.sync.sendContentRemoveRequest('', [cid])
    this.roomContentsInfo.delete(cid)
    this.updateAll()
  }
  //  request content by id which is not sent yet.
  requestContent(cids: string[]){
    conference.dataConnection.pushOrUpdateMessageViaRelay(MessageType.CONTENT_UPDATE_REQUEST_BY_ID, cids)
  }
  //  Update request from remote.
  updateByRemoteRequest(cs: ISharedContent[]) {
    for (const c of cs) {
      this.roomContents.set(c.id, c)
      if ((c.type === 'screen' || c.type === 'camera')) {
        this.onUpdateScreenContent(c)
      }
    }
    this.updateAll()
  }
  //  Remove request from remote.
  removeByRemoteRequest(cids: string[]) {
    for (const cid of cids) {
      const toRemove = this.roomContents.get(cid)
      if (toRemove){
        this.disposeContent(toRemove)
        this.roomContents.delete(cid)
      }else{
        if (contents.editing === cid){
          contents.editing = ''
        }
      }
      contents.roomContentsInfo.delete(cid)
    }
    this.updateAll()
  }
  clearAllRemotes(){
    this.roomContents.clear()
    this.roomContentsInfo.clear()
  }

  removeAllContents(){
    const cids = Array.from(this.roomContentsInfo.keys())
    conference.dataConnection.sync.sendContentRemoveRequest('', cids)
    this.roomContents.clear()
    this.roomContentsInfo.clear()
    this.updateAll()
  }

  // create a new unique content id
  private getUniqueId(): string {
    const pid = participantsStore.localId
    while (1) {
      this.contentIdCounter += 1
      const id = `${pid}_${this.contentIdCounter}`
      if (config.bmRelayServer){
        if (!this.roomContents.has(id)) { return id }
      }else{
        if (!this.owner.has(id)) { return id }
      }
    }

    //  eslint-disable-next-line no-unreachable
    return ''
  }

  private disposeContent(c: ISharedContent) {
    if (c.id === this.editing){
      this.setEditing('')
    }
    if (c.type === 'screen' || c.type === 'camera') {
      const peer = this.owner.get(c.id)
      if (peer) {
        if (peer === participants.localId){
          conference.removeLocalTrackByRole(c.id)
        }else{
          conference.closeTrack(peer, c.id)
        }
      }
    }
  }

  private onUpdateScreenContent(c: ISharedContent){
    const peer = this.owner.get(c.id)
    if (peer){
      if (peer === participants.localId){

      }else{

      }
    }
  }
  private clearContentTracks(){

  }

  //  screen fps setting
  @observable screenFps = 5
  @action setScreenFps(fps: number){ this.screenFps = fps }
}

const contents = new SharedContents()
declare const d:any
d.contents = contents
export default contents
