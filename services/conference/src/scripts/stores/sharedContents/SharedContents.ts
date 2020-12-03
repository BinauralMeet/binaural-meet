import {ParticipantContents as IParticipantContents, SharedContent as ISharedContent} from '@models/SharedContent'
import {diffMap} from '@models/utils'
import {default as participantsStore} from '@stores/participants/Participants'
import {EventEmitter} from 'events'
import _ from 'lodash'
import {action, autorun, computed, observable} from 'mobx'
import {createContent, disposeContent} from './SharedContentCreator'
import {SharedContentTracks} from './SharedContentTracks'

export const CONTENTLOG = false      // show manipulations and sharing of content
export const contentLog = CONTENTLOG ? console.log : (a:any) => {}
export const contentDebug = CONTENTLOG ? console.debug : (a:any) => {}


function contentComp(a:ISharedContent, b:ISharedContent) {
  return a.zorder - b.zorder
}

export class ParticipantContents implements IParticipantContents {
  constructor(pid: string) {
    this.participantId = pid
  }
  contentIdCounter = 0
  participantId = ''
  @observable.shallow myContents = new Map<string, ISharedContent>()
  @observable.shallow updateRequest = new Map<string, ISharedContent>()
  @observable.shallow removeRequest = new Set<string>()
}

export const SharedContentsEvents = {
  REMOTE_JOIN: 'join',
  REMOTE_LEAVE: 'leave',
}
export class SharedContents extends EventEmitter {
  private localId = ''
  constructor() {
    super()
    autorun(() => {
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
  // -----------------------------------------------------------------
  //  Contents management
  //  All shared contents in Z order. Observed by component.
  @observable.shallow all: ISharedContent[] = []
  //  contents by owner
  participants: Map < string, ParticipantContents > = new Map<string, ParticipantContents>()
  leavingParticipants: Map < string, ParticipantContents > = new Map<string, ParticipantContents>()

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
    content.moveToTop()
    this.addLocalContent(content)
  }

  @computed get localParticipant(): ParticipantContents {
    const p = this.participants.get(this.localId)
    if (!p) {
      const n = new ParticipantContents(this.localId)
      this.participants.set(this.localId, n)
      contentLog('Create ParticipantContents for local participant ', this.localId)

      return n
    }

    return p
  }

  //  map from contentId to participantId
  owner: Map < string, string > = new Map<string, string>()

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
      newAll.push(... participant.myContents.values())
    })
    newAll.sort(contentComp)
    this.all = newAll
    //  console.log('update all len=', this.all.length, ' all=', JSON.stringify(this.all))
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
  }

  //  replace contents of one participant. A content can be new one (add) or exsiting one (update).
  replaceRemoteContents(pid: string, cs:ISharedContent[]) { //  entries = [pid, content][]
    if (pid === participantsStore.localId) {  //  this is for remote participant
      console.error('Error replaceContents called for local participant')

      return
    }
    //  prepare participantContents
    let participant = this.participants.get(pid)
    if (!participant) {
      participant = new ParticipantContents(pid)
      this.participants.set(pid, participant)
      this.emit(SharedContentsEvents.REMOTE_JOIN,  participant)
    }

    const newContents = new Map(cs.map(c => [c.id, c]))
    contentLog(`replaceContents for participant=${pid} n=${newContents.size} cids:`,
               JSON.stringify(Array.from(newContents.keys())))
    const removed = diffMap(participant.myContents, newContents)

    //  Check remove request and update request to remove them.
    removed.forEach((c) => {
      this.localParticipant.removeRequest.delete(c.id)
      this.localParticipant.updateRequest.delete(c.id)
    })

    //  Check if removal of leaving partitipant is possible or not.
    this.leavingParticipants.forEach((leaving, pid) => {
      contentLog('Leave check pid=', pid, ' cids:', JSON.stringify(Array.from(leaving.myContents.keys())))
      const diff = diffMap(newContents, leaving.myContents)
      if (diff.size !== newContents.size) {
        this.leavingParticipants.delete(pid)
        this.removeParticipant(pid)
      }
    })

    //  Remove update requests for newContents
    for (const [key, nc] of newContents) {
      this.localParticipant.updateRequest.delete(key)
    }

    //  update contents
    removed.forEach((c) => {
      this.owner.delete(c.id)
    })
    newContents.forEach((c) => { this.owner.set(c.id, pid) })
    participant.myContents = newContents
    this.updateAll()
  }

  //  Update contents. For update requset.
  updateContents(cs: ISharedContent[]) {
    cs.forEach((c) => {
      const pid = this.owner.get(c.id)
      if (pid) {
        const participant = this.participants.get(pid)
        contentLog(`updateContents for participant:${pid}`)
        contentDebug(` update ${c.id} by ${c}`)
        contentDebug(' myContents=', JSON.stringify(participant?.myContents))

        participant?.myContents.set(c.id, c)
      }else {
        console.error('unpdateContents called for ', c.id, ' with invalid owner pid=', pid)
      }
    })
    this.updateAll()
  }

  //  Remove contents when the content is owned by local participant
  removeContents(pid: string, cids: string[]) {
    const participant = this.participants.get(pid)
    if (participant) {
      const mine = new Map<string, ISharedContent>(participant.myContents)

      // dispose content
      cids.forEach((cid) => {
        const content = mine.get(cid)
        if (content) { disposeContent(content) }
      })

      // remove them from myContents
      cids.forEach(cid => mine.delete(cid))
      participant.myContents = mine
      this.updateAll()
      if (pid !== this.localId) {
        const newRemoveRequest = new Set<string>(this.localParticipant.removeRequest)
        cids.forEach(cid => newRemoveRequest.add(cid))
        this.localParticipant.removeRequest = newRemoveRequest
        contentLog('removeContents update remove request', newRemoveRequest)
      }
      contentLog('removeContents cids=', cids, ' all=', this.all.length, this.all)
    }else {
      console.error('removeContents failed to find pid=', pid)
    }
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
      if (next === this.localId) {
        contentLog('Next is me')
        const myContents = new Map<string, ISharedContent>(this.localParticipant.myContents)
        participantLeave.myContents.forEach((c, cid) => {
          myContents.set(cid, c)
          this.owner.set(cid, this.localId)
          contentLog('set owner for cid=', cid, ' pid=', this.localId)
        })
        this.removeParticipant(pidLeave)
        contentLog('remove:', pidLeave, ' current:', JSON.stringify(allPids))
        contentLog('local contents sz:', myContents.size, ' json:', JSON.stringify(Array.from(myContents.keys())))
        this.localParticipant.myContents = myContents
        this.updateAll()
      }else {
        contentLog('Next is remote')
        this.leavingParticipants.set(pidLeave, participantLeave)
      }
    }
  }

  private removeParticipant(pid:string) {
    const participant = this.participants.get(pid)
    if (participant) {
      this.emit(SharedContentsEvents.REMOTE_LEAVE,  participant)
      this.participants.delete(pid)
      //  myContents will move to another participant and owner will be overwrite. So, no change on owner.
    }
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
