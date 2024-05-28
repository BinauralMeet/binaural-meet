import {MessageType} from '@models/conference/DataMessageType'
import {isContentWallpaper, ISharedContent, SharedContentInfo} from '@models/ISharedContent'
import {PARTICIPANT_SIZE} from '@models/Participant'
import {TrackRoles, TrackKind} from '@models/conference/RtcConnection'
import {assert} from '@models/utils'
import {getRect, isCircleInRect} from '@models/utils'
import {default as participantsStore} from '@stores/participants/Participants'
import participants from '@stores/participants/Participants'
import {EventEmitter} from 'events'
import {action, autorun, makeObservable, observable} from 'mobx'
import {createContent, defaultContent, moveContentToTop} from './SharedContentCreator'
import {conference} from '@models/conference'
import _ from 'lodash'
import { MediaClip } from '@stores/MapObject'

export const TITLE_HEIGHT = 24

function zorderComp(a:ISharedContent, b:ISharedContent) {
  return a.zorder - b.zorder
}

export interface PeerAndTracks {
  peer: string
  tracks: MediaStreamTrack[]
}

export class SharedContents extends EventEmitter {
  private contentIdCounter = 0
  constructor() {
    super()
    makeObservable(this)
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
  //  The contents. Only visible contents are received.
  @observable.shallow roomContents = new Map<string, ISharedContent>()
  //  Info of the contents. All contents are listed.
  @observable.shallow roomContentsInfo = new Map<string, SharedContentInfo>()
  //  Contents for playback.
  @observable.shallow playbackContents = new Map<string, ISharedContent>()

  //  Tracks
  @observable.ref mainScreenStream?: MediaStream
  @observable mainScreenOwner: string | undefined
  @observable.deep contentTracks = new Map<string, PeerAndTracks>()  //  cid -> stream
  public getContentTracks(cid:string){ return this.contentTracks.get(cid) }
  public getContentTrack(cid:string, kind:TrackKind){
    const tracks = this.contentTracks.get(cid)?.tracks
    return tracks?.find(t => t.kind === kind)
  }
  public getOrCreateContentTracks(peer: string, cid: string): PeerAndTracks{
    if(!this.contentTracks.has(cid)){
      this.contentTracks.set(cid, {peer, tracks:[]})
    }
    const pat = this.contentTracks.get(cid)!
    if (peer){
      assert(!pat.peer || pat.peer === peer)
      pat.peer = peer
    }
    return pat
  }

  public addTrack(peer: string, role: TrackRoles, track: MediaStreamTrack){
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
      const tracks = this.getOrCreateContentTracks(peer, role).tracks
      tracks.push(track)
    }
  }
  public removeTrack(peer: string, role: TrackRoles, kind?: TrackKind){
    if (role === 'mainScreen'){
      if (this.mainScreenOwner === peer){
        const ms = new MediaStream()
        if (kind){
          if (kind === 'audio'){
            this.mainScreenStream?.getVideoTracks().forEach(ms.addTrack)
          }else{
            this.mainScreenStream?.getAudioTracks().forEach(ms.addTrack)
          }
        }
        if (ms.getTracks().length){
          this.mainScreenStream = ms
        }else{
          this.mainScreenStream = undefined
        }
        this.mainScreenOwner = undefined
      }
    }else{
      const tracks = this.contentTracks.get(role)?.tracks
      if (tracks){
        if (kind){
          const i = tracks.findIndex(t=>t.kind === kind)
          if (i>=0){
            tracks[i].stop()
            tracks.splice(i, 1)
          }
        }else{
          tracks.forEach(track => {
            track.stop()
          })
          tracks.length = 0
        }
      }else{
        console.log(`removeRemoteTrack(): tracks for content ${role} not found.`)
      }
    }
  }
  public getAllRtcContentIds(){
    return Array.from(this.contentTracks.keys())
  }
  public getLocalRtcContentIds(){
    return Array.from(this.contentTracks.keys())
      .filter(cid=>this.contentTracks.get(cid)!.peer === conference.rtcTransports.peer)
  }
  public getRemoteRtcContentIds(){
    return Array.from(this.contentTracks.keys())
      .filter(cid=>this.contentTracks.get(cid)!.peer !== conference.rtcTransports.peer)
  }

  //  Playback Clips
  @observable.deep playbackClips = new Map<string, MediaClip>()  //  cid -> clip

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
  public assignId(c:ISharedContent) {
    if (!c.id) {
      c.id = this.getUniqueId()
    }
  }

  @action updatePlayback(content: ISharedContent){
    content.playback = true
    this.playbackContents.set(content.id, content)
    this.updateAll()
  }
  @action removePlayback(cid: string){
    this.playbackClips.delete(cid)
    this.playbackContents.delete(cid)
    this.updateAll()
  }
  findPlayback(cid: string){
    return this.playbackContents.get(cid)
  }
  getOrCreatePlayback(cid: string): ISharedContent{
    let rv = this.findPlayback(cid)
    if (!rv){
      rv = _.cloneDeep(defaultContent)
      rv.id = cid
      this.playbackContents.set(cid, rv)
    }
    return rv
  }
  getOrCreatePlaybackClip(cid: string): MediaClip{
    let rv = this.playbackClips.get(cid)
    if (!rv){
      rv = new MediaClip()
      this.playbackClips.set(cid, rv)
    }
    return rv
  }
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
    this.assignId(c)
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
    if (cid === 'mainScreen'){
      if (this.mainScreenOwner === conference.rtcTransports.peer){
        conference.removeLocalTrackByRole(true, 'mainScreen')
      }
    }else{
      const toRemove = this.roomContents.get(cid)
      if (toRemove){
        this.disposeContent(toRemove)
        this.roomContents.delete(cid)
      }
      conference.dataConnection.sync.sendContentRemoveRequest('', [cid])
      this.roomContentsInfo.delete(cid)
    }
    this.updateAll()
  }
  //  request content by id which is not sent yet.
  requestContent(cids: string[]){
    conference.dataConnection.sendMessage(MessageType.CONTENT_UPDATE_REQUEST_BY_ID, cids)
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
      if (!this.roomContents.has(id) && !participantsStore.remote.has(id)) { return id }
    }

    //  eslint-disable-next-line no-unreachable
    return ''
  }

  private disposeContent(c: ISharedContent) {
    if (c.id === this.editing){
      this.setEditing('')
    }
    if (c.type === 'screen' || c.type === 'camera') {
      const peerAndTracks = this.contentTracks.get(c.id)
      if (peerAndTracks?.peer) {
        if (peerAndTracks.peer === participants.localId){
          conference.removeLocalTrackByRole(true, c.id)
          this.contentTracks.delete(c.id)
        }else{
          //  Track will removed via rtcTransports
          //  conference.closeTrack(peerAndTracks.peer, c.id)
          //  this.contentTracks.delete(c.id)
        }
      }
    }
  }

  private onUpdateScreenContent(c: ISharedContent){
    //console.log(`onUpdateScreenContent(${JSON.stringify(c)})`)
    //const peerAndTracks = this.contentTracks.get(c.id)
    //console.log(`peerAndTracks = ${JSON.stringify(peerAndTracks)}`)
  }

  //  screen fps setting
  @observable screenFps = 5
  @action setScreenFps(fps: number){ this.screenFps = fps }
}

const contents = new SharedContents()
declare const d:any
d.contents = contents
export default contents
