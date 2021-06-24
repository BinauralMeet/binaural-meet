import {SharedContent as ISharedContent} from '@models/SharedContent'
import {diffMap} from '@models/utils'
import {default as participantsStore} from '@stores/participants/Participants'
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

    //  console.log('update all len=', this.all.length, ' all=', JSON.stringify(this.all))
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
  updateRemoteContents(cs: ISharedContent[], pid:string) {
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
  removeRemoteContents(cids: string[], pid:string) {
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
      this.pendToRemoveParticipant(participantLeave)
      this.updateAll()
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
  @observable screenFps = 30
  @action setScreenFps(fps: number){ this.screenFps = fps }
}
