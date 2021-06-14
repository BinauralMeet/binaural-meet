import {connection} from '@models/api'
import {SharedContent as ISharedContent, WallpaperStore} from '@models/SharedContent'
import {diffMap, intersectionMap} from '@models/utils'
import {default as participantsStore} from '@stores/participants/Participants'
import {EventEmitter} from 'events'
import _ from 'lodash'
import {action, autorun, computed, makeObservable, observable} from 'mobx'
import {createContent, disposeContent, extractContentDatas, isContentWallpaper, moveContentToTop} from './SharedContentCreator'
import {SharedContentTracks} from './SharedContentTracks'

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
  private localId = ''
  constructor() {
    super()
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
  }
  tracks = new SharedContentTracks(this)

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

  removeSameWallpaper(bgs: ISharedContent[]) {
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
    let changed = false
    this.participants.forEach((remote) => {
      if (remote.participantId > this.localParticipant.participantId) {
        const com = intersectionMap(remote.myContents, this.localParticipant.myContents)
        com.forEach((c, cid) => {
          disposeContent(c)
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
    this.removeDuplicated()
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

    this.saveWallpaper()
    //  console.log('update all len=', this.all.length, ' all=', JSON.stringify(this.all))
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
    if (!this.wallpapers) {
      this.loadWallpaper()
    }
    let newWallPapers = this.getWallpaper()
    if (newWallPapers.find((c, idx) => c !== this.oldWallPapers[idx])
     || newWallPapers.length !== this.oldWallPapers.length){
       this.oldWallPapers = newWallPapers //  save old one to compare next time.
      //  check dupulicated wall papers.
      if (this.removeSameWallpaper(newWallPapers)) { newWallPapers = this.getWallpaper() }
      //  update wallpapers in localStorage
      const newStore:WallpaperStore = {room:connection.conferenceName, contents:extractContentDatas(newWallPapers)}
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
      const loaded = wpStores.find(store => store.room === connection.conferenceName)
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
  //  updated by local user
  updateByLocal(newContent: ISharedContent) {
    const {pid, pc} = this.checkAndGetContent(newContent.id, 'updateByLocal')
    if (pc) {
      if (pid === this.localId) {
        pc.myContents.set(newContent.id, newContent)
        this.updateAll()
        connection.conference.sync.sendMyContents()
      }else if (pid) {
        connection.conference.sync.sendContentUpdateRequest(pid, newContent)
      }
    }
  }
  //  removed by local user
  removeByLocal(cid: string) {
    const {pid, pc} = this.checkAndGetContent(cid, 'removeByLocal')
    if (pc) {
      if (pid === this.localId) {
        const toRemove = pc.myContents.get(cid)
        if (toRemove) {
          disposeContent(toRemove)
          pc.myContents.delete(cid)
          this.owner.delete(cid)
          this.updateAll()
          connection.conference.sync.sendMyContents()
        }else {
          console.log(`Failed to find myContent ${cid} to remove.`)
        }
      }else if (pid) {
        connection.conference.sync.sendContentRemoveRequest(pid, cid)
      }
    }
  }
  //  Update request from remote.
  updateByRemoteRequest(c: ISharedContent) {
    const pid = this.owner.get(c.id)
    if (pid === this.localId) {
      this.updateByLocal(c)
    }else {
      console.error(`This update request is for ${pid} and not for me.`)
    }
  }
  //  Remove request from remote.
  removeByRemoteRequest(cid: string) {
    const {pid, pc} = this.checkAndGetContent(cid, 'removeByRemoteRequest')
    if (pc) {
      if (pid === this.localId) {
        this.removeByLocal(cid)
      }else {
        console.error('remote try to remove my content')
      }
    }
  }

  //  replace remote contents of an remote user by remote.
  replaceRemoteContents(cs: ISharedContent[], pid:string) {
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
  updateRemoteContents(cs: ISharedContent[], pid:string) {
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
  removeRemoteContents(cids: string[], pid:string) {
    if (pid === contents.localId) {
      console.error('Remote removes local contents.')
    }
    const pc = this.getParticipant(pid)
    cids.forEach((cid) => {
      const c = pc.myContents.get(cid)
      if (c) {
        disposeContent(c)
        pc.myContents.delete(cid)
        this.owner.delete(cid)
      }else {
        console.error(`removeByRemote: failed to find content cid=${cid}`)
      }
    })
    this.updateAll()
  }

  //  If I'm the next, obtain the contents
  onParticipantLeft(pidLeave:string) {
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
        participantLeave.myContents.forEach((c, cid) => {
          if (c.type === 'screen' || c.type === 'camera') {
            this.owner.delete(cid)
            participantLeave.myContents.delete(cid)
            disposeContent(c)
          }else {
            this.localParticipant.myContents.set(cid, c)
            this.owner.set(cid, this.localId)
            updated = true
            contentLog('set owner for cid=', cid, ' pid=', this.localId)
          }
        })
        contentLog('remove:', pidLeave, ' current:', JSON.stringify(allPids))
        contentLog('local contents sz:', this.localParticipant.myContents.size,
                   ' json:', JSON.stringify(Array.from(this.localParticipant.myContents.keys())))
        this.removeParticipant(participantLeave)
      }else {
        contentLog('Next is remote')
        this.pendToRemoveParticipant(participantLeave)
      }
      this.updateAll()
      if (updated){
        connection.conference.sync.sendMyContents()
      }
    }
  }

  private pendToRemoveParticipant(pc: ParticipantContents){
    const remove = Array.from(pc.myContents.values()).filter(c => c.type === 'camera' || c.type ==='screen')
    remove.forEach(c => pc.myContents.delete(c.id))
    this.pendToRemoves.set(pc.participantId, pc)
    this.removeParticipant(pc)
  }

  private removeParticipant(pc: ParticipantContents) {
    this.participants.delete(pc.participantId)
  }

  clearAllRemotes(){
    const remotes = Array.from(this.participants.keys()).filter(key => key !== this.localId)
    remotes.forEach(pid=>this.participants.delete(pid))
    this.tracks.clearConnection()
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
}

const contents = new SharedContents()
declare const d:any
d.contents = contents
export default contents
