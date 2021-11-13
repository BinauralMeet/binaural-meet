import {connection} from '@models/api'
import {MessageType} from '@models/api/MessageType'
import {extractSharedContentInfo, isContentWallpaper, ISharedContent, SharedContentInfo, WallpaperStore} from '@models/ISharedContent'
import {PARTICIPANT_SIZE} from '@models/Participant'
import {diffMap, intersectionMap} from '@models/utils'
import {assert} from '@models/utils'
import {getRect, isCircleInRect} from '@models/utils'
import {default as participantsStore} from '@stores/participants/Participants'
import participants from '@stores/participants/Participants'
import {EventEmitter} from 'events'
import _ from 'lodash'
import {action, autorun, computed, makeObservable, observable} from 'mobx'
import {createContent, extractContentDatas, moveContentToTop} from './SharedContentCreator'
import {SharedContentTracks} from './SharedContentTracks'

export const CONTENTLOG = false      // show manipulations and sharing of content
export const contentLog = CONTENTLOG ? console.log : (a:any) => {}
export const contentDebug = CONTENTLOG ? console.debug : (a:any) => {}

export const TITLE_HEIGHT = 24

// config.js
declare const config:any             //  from ../../config.js included from index.html

function zorderComp(a:ISharedContent, b:ISharedContent) {
  return a.zorder - b.zorder
}

export class ParticipantContents{
  constructor(pid: string) {
    assert(!config.bmRelayServer)
    makeObservable(this)
    this.participantId = pid
  }
  participantId = ''
  @observable.shallow myContents = new Map<string, ISharedContent>()
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
      const local = this.participants.get(this.localId)
      if (local) {
        this.participants.delete(this.localId)
        local.participantId = newLocalId
        this.participants.set(newLocalId, local)
      }
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
  tracks = new SharedContentTracks(this)
  @observable pasteEnabled = true
  @observable editing = ''                        //  the user editing content
  @observable.shallow all: ISharedContent[] = []  //  all contents to display
  sorted: ISharedContent[] = []                   //  all contents sorted by zorder (bottom to top)
  @observable.shallow zones: ISharedContent[] = []        //  audio zones sorted by zorder (top to bottom)
  @observable.shallow closedZones: ISharedContent[] = []  //  closed audio zones sorted by zorder (top to bottom)
  //  Contents by owner  used only when no relay server exists.
  participants: Map < string, ParticipantContents > = new Map<string, ParticipantContents>()
  pendToRemoves: Map < string, ParticipantContents > = new Map<string, ParticipantContents>()
  //  Contents by room  used only when a relay server exsits.
  @observable.shallow roomContents = new Map<string, ISharedContent>()
  //  Contents info     used only when a relay server exsits.
  @observable.shallow roomContentsInfo = new Map<string, SharedContentInfo>()
  //  Contents for playback.
  @observable.shallow playbackContents = new Map<string, ISharedContent>()

  getParticipant(pid: string) {
    assert(!config.bmRelayServer)
    //  prepare participantContents
    let participant = this.participants.get(pid)
    if (!participant) {
      participant = new ParticipantContents(pid)
      this.participants.set(pid, participant)
    }

    return participant
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

  @computed get localParticipant(): ParticipantContents {
    return this.getParticipant(this.localId)
  }

  //  Map<cid, pid>, map from contentId to participantId
  owner: Map<string, string> = new Map<string, string>()

  public find(cid: string) {
    if (config.bmRelayServer){
      return this.roomContents.get(cid)
    }else{
      const pid = this.owner.get(cid)
      if (pid) {
        return this.participants.get(pid)?.myContents.get(cid)
      }
    }

    return undefined
  }

  removeSameWallpaper(bgs: ISharedContent[]) {
    assert(!config.bmRelayServer)

    let rv = false
    this.localParticipant.myContents.forEach((c) => {
      if (isContentWallpaper(c)) {
        const same = bgs.find(t => c.url === t.url && _.isEqual(c.pose, t.pose))
        if (same) {
          //  const pid = this.owner.get(same.id)
          if (same.id !== c.id && same.zorder <= c.zorder) {
            this.removeByLocal(c.id)
            rv = true
            console.warn(`My wallpapers id:${c.id} url:${c.url} removed.`)
          }
        }
      }
    })

    return rv
  }

  checkDuplicatedWallpaper(pid: string, cs: ISharedContent[]) {
    assert(!config.bmRelayServer)

    if (config.bmRelayServer){ return }

    const targets = cs.filter(isContentWallpaper)
    this.localParticipant.myContents.forEach((c) => {
      if (isContentWallpaper(c)) {
        const same = targets.find(t => c.url === t.url && _.isEqual(c.pose, t.pose))
        if (same && same.zorder <= c.zorder) {
          this.removeByLocal(c.id)
          console.warn(`My wallpapers id:${c.id} url:${c.url} removed.`)
        }
      }
    })
  }

  private removeDuplicated() {
    assert(!config.bmRelayServer)

    let changed = false
    this.participants.forEach((remote) => {
      if (remote.participantId > this.localParticipant.participantId) {
        const com = intersectionMap(remote.myContents, this.localParticipant.myContents)
        com.forEach((c, cid) => {
          this.disposeContent(c)
          this.localParticipant.myContents.delete(cid)
        })
        changed = changed || com.size !== 0
      }
    })
    if (changed) {
      connection.conference.sync.sendMyContents()
    }
  }
  private updateAll() {
    const newAll:ISharedContent[] = []
    if (config.bmRelayServer){
      Object.assign(newAll, Array.from(this.roomContents.values()))
    }else{
      this.removeDuplicated()
      this.participants.forEach((participant) => {
        newAll.push(...participant.myContents.values())
      })
      this.pendToRemoves.forEach((participant) => {
        newAll.push(...participant.myContents.values())
      })
    }
    newAll.push(...Array.from(this.playbackContents.values()))

    const newSorted = Array.from(newAll).sort(zorderComp)
    newSorted.forEach((c, idx) => {c.zIndex = idx+1})

    //  update observed values
    this.all = newAll
    this.sorted = newSorted
    this.zones = this.sorted.filter(c => c.zone !== undefined).reverse()
    this.closedZones = this.zones.filter(c => c.zone === 'close')

    if (!config.bmRelayServer){
      this.saveWallpaper()
    }
  }

  //  wallpaper contents
  wallpapers = ''
  private getWallpaper() {
    let nWallpapers = this.sorted.findIndex((c) => !isContentWallpaper(c))
    if (nWallpapers < 0) { nWallpapers = this.sorted.length }

    return this.sorted.slice(0, nWallpapers)
  }
  private oldWallPapers: ISharedContent[] = []
  private saveWallpaper() {
    if (!this.localId) { return }
    if (!this.wallpapers) { this.loadWallpaper() }
    let newWallPapers = this.getWallpaper()
    if (newWallPapers.find((c, idx) => c !== this.oldWallPapers[idx])
     || newWallPapers.length !== this.oldWallPapers.length){
       this.oldWallPapers = newWallPapers //  save old one to compare next time.
      //  check dupulicated wall papers.
      if (this.removeSameWallpaper(newWallPapers)) { newWallPapers = this.getWallpaper() }
      //  update wallpapers in localStorage
      const newStore:WallpaperStore = {room:connection.conference.name, contents:extractContentDatas(newWallPapers)}
      let wpStores:WallpaperStore[] = []
      const oldStr = localStorage.getItem('wallpapers')
      if (oldStr) { wpStores = JSON.parse(oldStr) as WallpaperStore[] }
      const idx = wpStores.findIndex(wps => wps.room ===  newStore.room)
      idx === -1 ? wpStores.push(newStore) : wpStores[idx] = newStore
      localStorage.setItem('wallpapers', JSON.stringify(wpStores))
    }
  }
  loadWallpaper() {
    if (this.wallpapers) { return }         //  already loaded
    const curWp = this.getWallpaper()
    if (curWp.length) {                     //  already exist
      this.wallpapers = JSON.stringify(curWp)

      return
    }

    //  load wallpapers from local storage
    const str = localStorage.getItem('wallpapers')
    if (!str) {
      this.wallpapers = JSON.stringify([])
    }else {
      const wpStores = JSON.parse(str) as WallpaperStore[]
      const loaded = wpStores.find(store => store.room === connection.conference.name)
      if (loaded) {
        loaded.contents.forEach((lc) => {
          const newContent = createContent()
          Object.assign(newContent, lc)
          this.addLocalContent(newContent)
        })
        this.wallpapers = JSON.stringify(this.getWallpaper())
      }
    }
  }

  //  add
  addLocalContent(c:ISharedContent) {
    if (config.bmRelayServer){
      if (!c.id) { c.id = this.getUniqueId() }
      this.updateByLocal(c)
    }else{
      if (!participantsStore.localId) {
        console.error('addLocalContant() failed. Invalid Participant ID.')

        return
      }
      if (!c.id) { c.id = this.getUniqueId() }
      this.localParticipant.myContents.set(c.id, c)
      this.owner.set(c.id, participantsStore.localId)
      //  console.log('addLocalConent', c)
      this.updateAll()
      connection.conference.sync.sendMyContents()
    }
  }

  takeContentsFromDead(pc: ParticipantContents, cidTake?: string){
    //  console.log(`Take ${cidTake} from pid:${pc.participantId}`)
    let updated = false
    pc.myContents.forEach((c, cid) => {
      if (cidTake && cidTake !== cid) { return }
      if (c.type === 'screen' || c.type === 'camera') {
        pc.myContents.delete(cid)
        this.owner.delete(cid)
        this.disposeContent(c)
      }else {
        this.localParticipant.myContents.set(cid, c)
        pc.myContents.delete(cid)
        this.owner.set(cid, this.localId)
        updated = true
        contentLog('set owner for cid=', cid, ' pid=', this.localId)
      }
    })
    if (pc.myContents.size === 0){
      this.participants.delete(pc.participantId)
      this.pendToRemoves.delete(pc.participantId)
    }

    return updated
  }

  private getOrTakeContent(cid: string, callBy?:string) {
    const pid = this.owner.get(cid)
    if (pid) {
      const pc = this.participants.get(pid)
      if (pc) {
        if (pid === this.localId || participants.remote.has(pid)){
          return {pid, pc, take:false}  //  get content
        }else{
          //  The participant own the contents is already left but not notified.
          this.takeContentsFromDead(pc)
          connection.conference.sendMessage(MessageType.PARTICIPANT_LEFT, [pid])

          return {pid: this.localId, pc: this.participants.get(this.localId), take:true}
        }
      }else{
        const pc = this.pendToRemoves.get(pid)
        if (pc){
          if (this.takeContentsFromDead(pc, cid)){
            return {pid: this.localId, pc: this.participants.get(this.localId), take:true}
          }
        }
      }
    }
    console.error(`${callBy}: No owner for cid=${cid}`)

    return {pid, pc:undefined, take:false}
  }

  private checkAndGetContent(cid: string, callBy?:string) {
    const pid = this.owner.get(cid)
    if (pid) {
      const pc = pid ? this.participants.get(pid) : undefined
      if (!pc) {
        console.error(`${callBy}: Owner does not have cid=${cid}`)
      }

      return {pid, pc}
    }
    console.error(`${callBy}: No owner for cid=${cid}`)

    return {pid, pc:undefined}
  }

  //  Temporaly update local only no sync with other participant.
  //  This makes non-detectable inconsistency and must call updateByLocal() soon later.
  updateLocalOnly(newContent: ISharedContent){
    if (config.bmRelayServer){
      this.roomContents.set(newContent.id, newContent)
    }else{
      const pc = this.checkAndGetContent(newContent.id, 'updateByLocal').pc
      if (pc) {
        pc.myContents.set(newContent.id, newContent)
      }
    }
    this.updateAll()
  }
  //  updated by local user
  updateByLocal(newContent: ISharedContent) {
    if (config.bmRelayServer){
      this.roomContents.set(newContent.id, newContent)
      connection.conference.sync.sendContentUpdateRequest('', [newContent])
      this.updateAll()
      this.roomContentsInfo.set(newContent.id, newContent)
    }else{
      const {pid, pc} = this.getOrTakeContent(newContent.id, 'updateByLocal')
      if (pc) {
        if (pid === this.localId) {
          pc.myContents.set(newContent.id, newContent)
          this.updateAll()
          connection.conference.sync.sendMyContents()
        }else if (pid) {
          connection.conference.sync.sendContentUpdateRequest(pid, [newContent])
        }
      }
    }
  }

  //  removed by local user
  removeByLocal(cid: string) {
    if (config.bmRelayServer){
      const toRemove = this.roomContents.get(cid)
      if (toRemove){
        this.disposeContent(toRemove)
        this.roomContents.delete(cid)
      }
      connection.conference.sync.sendContentRemoveRequest('', [cid])
      this.roomContentsInfo.delete(cid)
      this.updateAll()
    }else{
      const {pid, pc, take} = this.getOrTakeContent(cid, 'removeByLocal')
      //console.log(`remove by local pid:${pid} take;${take} cid:${cid}.`)
      if (pc) {
        if (take){
          //  if take the content from pendToRemoves, remove from pendToRemove in remotes.
          console.log(`sendLeftContentRemoveRequest of ${cid}.`)
          connection.conference.sync.sendLeftContentRemoveRequest([cid])
        }

        //  remove the content
        if (pid === this.localId) {
          this.removeMyContent(cid)
          connection.conference.sync.sendMyContents()
        }else if (pid) {
          if (participants.remote.has(pid)){
            connection.conference.sync.sendContentRemoveRequest(pid, [cid])
          }
        }
      } else if (pid && connection.conference.bmRelaySocket?.readyState === WebSocket.OPEN) {
        //  remove participant remaining in relay server
        if (!participants.remote.has(pid)){
          connection.conference.pushOrUpdateMessageViaRelay(MessageType.PARTICIPANT_LEFT, [pid])
        }
      }
    }
  }
  //  request content by id which is not sent yet.
  requestContent(cids: string[]){
    if (config.bmRelayServer){
      connection.conference.pushOrUpdateMessageViaRelay(MessageType.CONTENT_UPDATE_REQUEST_BY_ID, cids)
    }
  }
  //  Update request from remote.
  updateByRemoteRequest(cs: ISharedContent[]) {
    if (config.bmRelayServer){
      for (const c of cs) {
        this.roomContents.set(c.id, c)
        if ((c.type === 'screen' || c.type === 'camera')) {
          this.tracks.onUpdateContent(c)
        }
      }
    }else{
      const local = this.getParticipant(this.localId)
      for (const c of cs) {
        const pid = this.owner.get(c.id)
        if (pid === this.localId) {
          local.myContents.set(c.id, c)
        }else {
          console.error(`Update request of ${c.id} is for ${pid} and not for me.`)
        }
      }
      connection.conference.sync.sendMyContents()
    }
    this.updateAll()
  }
  //  Remove request from remote.
  removeByRemoteRequest(cids: string[]) {
    if (config.bmRelayServer){
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
    }else{
      for (const cid of cids){
        const {pid, pc} = this.checkAndGetContent(cid, 'removeByRemoteRequest')
        if (pc) {
          if (pid === this.localId) {
            this.removeMyContent(cid)
          }else {
            console.error('remote try to remove my content')
          }
        }
      }
      connection.conference.sync.sendMyContents()
    }
  }
  removeLeftContentByRemoteRequest(cids: string[]) {
    assert(!config.bmRelayServer)

    for (const cid of cids){
      const pid = this.owner.get(cid)
      if (pid){
        let pc = this.pendToRemoves.get(pid)
        if (!pc) { pc = this.participants.get(pid) }
        if (pc){
          pc.myContents.delete(cid)
          this.owner.delete(cid)
          if (pc.myContents.size === 0){
            this.participants.delete(pid)
            this.pendToRemoves.delete(pid)
          }
        }
      }
    }
  }
  //  remove my content
  private removeMyContent(cid:string, pid?: string){
    assert(!config.bmRelayServer)

    if (!pid) { pid = this.localId }
    const pc = this.getParticipant(pid)
    const toRemove = pc.myContents.get(cid)
    if (toRemove) {
      this.disposeContent(toRemove)
      pc.myContents.delete(cid)
      this.owner.delete(cid)
      this.updateAll()
      if (pid === this.localId){
        connection.conference.sync.sendMyContents()
      }
    }else {
      console.log(`I don't have ${cid} to remove.`)
    }
  }

  //  replace remote contents of an remote user by remote.
  replaceRemoteContents(cs: ISharedContent[], pid:string) {
    assert(!config.bmRelayServer)

    if (pid === contents.localId) {
      console.error('A remote tries to replace local contents.')
    }
    this.updateRemoteContents(cs, pid)
    const participant = this.getParticipant(pid)
    if (participant) {
      const newContents = new Map(cs.map(c => [c.id, c]))
      const remove = diffMap(participant.myContents, newContents)
      this.removeRemoteContents(Array.from(remove.keys()), pid)
    }
  }

  //  Update remote contents by remote.
  private updateRemoteContents(cs: ISharedContent[], pid:string) {
    assert(!config.bmRelayServer)

    if (pid === contents.localId) {
      console.error('A remote tries to updates local contents.')
    }
    cs.forEach((c) => {
      this.pendToRemoves.forEach(pc => pc.myContents.delete(c.id))        //  check pendToRemoves

      const remote = this.getParticipant(pid)
      contentLog(`updateContents for participant:${pid}`)
      contentDebug(` update ${c.id} by ${c}`)
      contentDebug(' myContents=', JSON.stringify(remote?.myContents))

      //  set owner
      if (remote.myContents.has(c.id)) {
        const owner = this.owner.get(c.id)
        if (owner !== pid) {
          console.error(`Owner not match for cid=${c.id} owner=${owner} pid=${pid}.`)
        }
      }else {
        this.owner.set(c.id, pid)
      }
      //  set content
      remote.myContents.set(c.id, c)
      contents.roomContentsInfo.set(c.id, extractSharedContentInfo(c))
      //  update track in cases of track based contents.
      if (c.type === 'screen' || c.type === 'camera') {
        this.tracks.onUpdateContent(c)
      }
    })
    this.pendToRemoves.forEach(pc => {
      if (pc.myContents.size === 0){ this.pendToRemoves.delete(pc.participantId) }
    })
    this.updateAll()
  }
  //  Remove remote contents by remote.
  private removeRemoteContents(cids: string[], pid:string) {
    assert(!config.bmRelayServer)

    if (pid === contents.localId) {
      console.error('Remote removes local contents.')
    }
    const pc = this.getParticipant(pid)
    cids.forEach((cid) => {
      const c = pc.myContents.get(cid)
      if (c) {
        this.disposeContent(c)
        pc.myContents.delete(cid)
        this.owner.delete(cid)
        this.roomContentsInfo.delete(cid)
      }else {
        console.error(`removeByRemote: failed to find content cid=${cid}`)
      }
    })
    this.updateAll()
  }

  //  If I'm the next, obtain the contents
  onParticipantLeft(pidLeave:string) {
    if (!config.bmRelayServer){

      contentLog('onParticipantLeft called with pid = ', pidLeave)
      const participantLeave = this.participants.get(pidLeave)
      if (participantLeave) {
        const allPids = Array.from(participantsStore.remote.keys())
        allPids.push(this.localId)
        allPids.sort()
        const idx = allPids.findIndex(cur => cur > pidLeave)
        const next = allPids[idx >= 0 ? idx : 0]
        contentLog('next = ', next)
        let updated = false
        if (next === this.localId) {
          contentLog('Next is me')
          updated = this.takeContentsFromDead(participantLeave) || updated
          contentLog('remove:', pidLeave, ' current:', JSON.stringify(allPids))
          contentLog('local contents sz:', this.localParticipant.myContents.size,
                     ' json:', JSON.stringify(Array.from(this.localParticipant.myContents.keys())))
        } else {
          contentLog('Next is remote')
          this.pendToRemoveParticipant(participantLeave)
        }
        this.updateAll()
        if (updated){
          connection.conference.sync.sendMyContents()
        }
      }
    }
  }

  private pendToRemoveParticipant(pc: ParticipantContents){
    assert(!config.bmRelayServer)

    const removes = Array.from(pc.myContents.values()).filter(c => c.type === 'camera' || c.type ==='screen')
    removes.forEach(c => {
      pc.myContents.delete(c.id)
      this.owner.delete(c.id)
    })
    this.pendToRemoves.set(pc.participantId, pc)
    this.participants.delete(pc.participantId)
  }

  clearAllRemotes(){
    if (config.bmRelayServer){
      this.roomContents.clear()
      this.roomContentsInfo.clear()
    }else{
      const remotes = Array.from(this.participants.keys()).filter(key => key !== this.localId)
      remotes.forEach(pid=>{
        const p = this.participants.get(pid)
        if (p){
          p.myContents.forEach(c => this.roomContentsInfo.delete(c.id))
        }
        this.participants.delete(pid)
      })
      this.tracks.clearConnection()
    }
  }

  removeAllContents(){
    if (config.bmRelayServer){
      const cids = Array.from(this.roomContentsInfo.keys())
      connection.conference.sync.sendContentRemoveRequest('', cids)
      this.roomContents.clear()
      this.roomContentsInfo.clear()
    }else{
      this.participants.forEach((pc, pid) => {
        if (pid !== this.localId){
          const cs = Array.from(pc.myContents.values())
          connection.conference.sync.sendContentRemoveRequest(pid, cs.map(c => c.id))
        }
      })
      this.pendToRemoves.forEach(pc => {
        const cs = Array.from(pc.myContents.values())
        connection.conference.sync.sendLeftContentRemoveRequest(cs.map(c => c.id))
      })
      this.owner.clear()
      this.participants.clear()
      this.pendToRemoves.clear()
      connection.conference.sync.sendMyContents()
      this.roomContentsInfo.clear()
    }
    this.updateAll()
  }

  // create a new unique content id
  getUniqueId(): string {
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

  disposeContent(c: ISharedContent) {
    if (c.id === this.editing){
      this.setEditing('')
    }
    if (c.type === 'screen' || c.type === 'camera') {
      if (this.tracks.contentCarriers.has(c.id)){
        this.tracks.clearLocalContent(c.id)
      }else{
        this.tracks.clearRemoteContent(c.id)
      }
    }
  }

  //  screen fps setting
  @observable screenFps = 5
  @action setScreenFps(fps: number){ this.screenFps = fps }
}

const contents = new SharedContents()
declare const d:any
d.contents = contents
export default contents
