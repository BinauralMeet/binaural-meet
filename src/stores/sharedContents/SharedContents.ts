import {MessageType} from '@models/api/ConferenceSync'
import {SharedContent as ISharedContent} from '@models/SharedContent'
import {diffMap} from '@models/utils'
import {default as participantsStore} from '@stores/participants/Participants'
import {Room} from '@stores/Room'
import {EventEmitter} from 'events'
import {action, autorun, computed, makeObservable, observable} from 'mobx'

export const CONTENTLOG = false      // show manipulations and sharing of content
export const contentLog = CONTENTLOG ? console.log : (a:any) => {}
export const contentDebug = CONTENTLOG ? console.debug : (a:any) => {}

function zorderComp(a:ISharedContent, b:ISharedContent) {
  return a.zorder - b.zorder
}

export class ParticipantContents{
  constructor(pid: string) {
    makeObservable(this)
    this.participantId = pid
  }
  contentIdCounter = 0
  participantId = ''
  @observable.shallow myContents = new Map<string, ISharedContent>()
}

export class SharedContents extends EventEmitter {
  room:Room
  private localId = ''
  constructor(room: Room) {
    super()
    this.room = room
    makeObservable(this)
    autorun(() => {
      //  sync localId to participantsStore
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
    autorun(() => {
      localStorage.setItem('screenFps', JSON.stringify(this.screenFps))
    })
  }

  @observable pasteEnabled = true

  //  the user editing content
  @observable editing = ''
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
  @observable.shallow all: ISharedContent[] = []
  @observable.shallow sorted: ISharedContent[] = []
  //  contents by owner
  participants: Map < string, ParticipantContents > = new Map<string, ParticipantContents>()
  pendToRemoves: Map < string, ParticipantContents > = new Map<string, ParticipantContents>()
  getParticipant(pid: string) {
    //  prepare participantContents
    let participant = this.participants.get(pid)
    if (!participant) {
      participant = new ParticipantContents(pid)
      this.participants.set(pid, participant)
    }

    return participant
  }

  @computed get localParticipant(): ParticipantContents {
    return this.getParticipant(this.localId)
  }

  //  Map<cid, pid>, map from contentId to participantId
  owner: Map<string, string> = new Map<string, string>()

  public find(contentId: string) {
    const pid = this.owner.get(contentId)
    if (pid) {
      return this.participants.get(pid)?.myContents.get(contentId)
    }

    return undefined
  }

  private updateAll() {
    const newAll:ISharedContent[] = []
    this.participants.forEach((participant) => {
      newAll.push(...participant.myContents.values())
    })
    this.pendToRemoves.forEach((participant) => {
      newAll.push(...participant.myContents.values())
    })
    const newSorted = Array.from(newAll).sort(zorderComp)
    newSorted.forEach((c, idx) => {c.zIndex = idx+1})

    //  update observed values
    this.all = newAll
    this.sorted = newSorted

    /*  do not save wall paper. Load wall paper may cause lost of wall paper
    this.saveWallpaper()  */

    //  console.log('update all len=', this.all.length, ' all=', JSON.stringify(this.all))
  }

  /*
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
  private loadWallpaper() {
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
  */
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
        if (pid === this.localId || this.room.participants.remote.has(pid)){
          return {pid, pc, take:false}  //  get content
        }else{
          //  The participant own the contents is already left but not notified.
          this.takeContentsFromDead(pc)
          this.room.connection?.conference.sendMessage(MessageType.PARTICIPANT_LEFT, '', pid)

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
    const pc = this.checkAndGetContent(newContent.id, 'updateByLocal').pc
    if (pc) {
      pc.myContents.set(newContent.id, newContent)
      this.updateAll()
    }
  }
  removeLeftContentByRemoteRequest(cids: string[]) {
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

  //  replace remote contents of an remote user by remote.
  replaceRemoteContents(cs: ISharedContent[], pid:string) {
    if (pid === this.localId) {
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
    if (pid === this.localId) {
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
    })
    this.pendToRemoves.forEach(pc => {
      if (pc.myContents.size === 0){ this.pendToRemoves.delete(pc.participantId) }
    })
    this.updateAll()
  }
  //  Remove remote contents by remote.
  private removeRemoteContents(cids: string[], pid:string) {
    if (pid === this.localId) {
      console.error('Remote removes local contents.')
    }
    const pc = this.getParticipant(pid)
    cids.forEach((cid) => {
      const c = pc.myContents.get(cid)
      if (c) {
        this.disposeContent(c)
        pc.myContents.delete(cid)
        this.owner.delete(cid)
      }else {
        console.error(`removeByRemote: failed to find content cid=${cid}`)
      }
    })
    this.updateAll()
  }

  onParticipantLeft(pidLeave:string) {
    contentLog('onParticipantLeft called with pid = ', pidLeave)
    const participantLeave = this.participants.get(pidLeave)
    if (participantLeave) {
      this.participants.delete(participantLeave.participantId)
      this.updateAll()
    }
  }

  clearAllRemotes(){
    const remotes = Array.from(this.participants.keys()).filter(key => key !== this.localId)
    remotes.forEach(pid=>this.participants.delete(pid))
  }

  // create a new unique content id
  getUniqueId() {
    const pid = participantsStore.localId
    if (!this.participants.has(pid)) {
      this.participants.set(pid, new ParticipantContents(pid))
    }
    const participant = this.participants.get(pid)
    if (participant) {
      while (1) {
        participant.contentIdCounter += 1
        const id = `${participant.participantId}_${participant.contentIdCounter}`
        if (!this.owner.has(id)) {
          return id
        }
      }
    }
    console.error('Error in getUniqueId()')

    return ''
  }

  disposeContent(c: ISharedContent) {
    if (c.id === this.editing){
      this.setEditing('')
    }
  }

  //  screen fps setting
  @observable screenFps = 5
  @action setScreenFps(fps: number){ this.screenFps = fps }
}
