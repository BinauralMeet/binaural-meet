import {TheatersOutlined} from '@material-ui/icons'
import {SharedContent as ISharedContent} from '@models/SharedContent'
import {default as participantsStore} from '@stores/participants/Participants'
import {diffMap} from '@stores/utils'
import {EventEmitter} from 'events'
import _ from 'lodash'
import {action, computed, observable} from 'mobx'
import {SharedContent} from './SharedContent'

function contentComp(a:ISharedContent, b:ISharedContent) {
  return a.zorder - b.zorder
}

export function generateSharedContentId(): string {
  if (!participantsStore.localId) {
    throw new Error('addLocalContant() failed. Invalid Participant ID.')

    return ''
  }

  return sharedContents.getUniqueId(participantsStore.localId)
}

export class ParticipantContents {
  constructor(pid: string) {
    this.participantId = pid
  }
  contentIdCounter = 0
  participantId = ''
  @observable.shallow contents = new Map<string, SharedContent>()
}

export const SharedContentsEvents = {
  REMOTE_JOIN: 'join',
  REMOTE_LEAVE: 'leave',
}
export class SharedContents extends EventEmitter {
  private localId = ''
  //  All shared objects in Z order. Observed by component.
  @observable.shallow contents: SharedContent[] = []
  //  contents by owner
  participants: Map<string, ParticipantContents> = new Map<string, ParticipantContents>()
  leavingParticipants: Map<string, ParticipantContents> = new Map<string, ParticipantContents>()

  @observable.shallow updateRequests = new Map<string, SharedContent>()
  @observable.shallow removeRequests = new Set<string>()

  @computed get localParticipant(): ParticipantContents {
    if (!this.localId) { this.localId = participantsStore.localId }
    const p = this.participants.get(this.localId)
    if (!p) {
      const n = new ParticipantContents(this.localId)
      this.participants.set(this.localId, n)
      console.log('Create ParticipantContents for local participant ', this.localId)

      return n
    }
    if (this.localId !== participantsStore.localId) {  //  update local id
      p.participantId = participantsStore.localId
      this.participants.delete(this.localId)
      this.participants.set(p.participantId, p)
      this.localId = p.participantId
      console.log('Set new local id ', p.participantId)
    }

    return p
  }

  //  map from contentId to participantId
  owner: Map <string, string> = new Map<string, string>()

  @action.bound
  private updateAll() {
    this.contents.length = 0
    this.participants.forEach((participant) => {
      this.contents.push(... participant.contents.values())
    })
    this.contents.slice().sort(contentComp)
    //  console.log('update all len=', this.all.length, ' all=', JSON.stringify(this.all))
  }

  //  add
  @action.bound
  addLocalContent(content:SharedContent) {
    this.localParticipant.contents.set(content.id, content)
    this.owner.set(content.id, participantsStore.localId)
    this.updateAll()
  }

  //  replace contents of one participant. A content can be new one (add) or exsiting one (update).
  @action.bound
  replaceRemoteContents(pid: string, contents:SharedContent[]) { //  entries = [pid, content][]
    if (pid === participantsStore.localId) {  //  this is for remote participant
      console.log('Error replaceContents called for local participant')

      return
    }
    //  prepare participantContents
    let participant = this.participants.get(pid)
    if (!participant) {
      participant = new ParticipantContents(pid)
      this.participants.set(pid, participant)
      this.emit(SharedContentsEvents.REMOTE_JOIN,  participant)
    }

    const newContents = new Map(contents.map(c => [c.id, c]))
    console.log('replaceContents for participant=', pid, ' n=', newContents.size,
                ' cids:', JSON.stringify(Array.from(newContents.keys())))
    const removed = diffMap(participant.contents, newContents)

    //  Check remove request and remove it.
    removed.forEach(c => this.removeRequests.delete(c.id))

    //  Check update request and remove request
    newContents.forEach((newContent) => {
      const updateReq = this.updateRequests.get(newContent.id)
      if (updateReq && _.isEqual(newContent, updateReq)) {
        this.updateRequests.delete(newContent.id)
      }
    })

    //  Check if removal of leaving partitipant is possible or not.
    this.leavingParticipants.forEach((leaving, pid) => {
      console.log('Leave check pid=', pid, ' cids:', JSON.stringify(Array.from(leaving.contents.keys())))
      const diff = diffMap(newContents, leaving.contents)
      if (diff.size !== newContents.size) {
        this.leavingParticipants.delete(pid)
        this.removeParticipant(pid)
      }
    })

    //  update contents
    removed.forEach((c) => {
      this.owner.delete(c.id)
    })
    newContents.forEach((c) => { this.owner.set(c.id, pid) })
    participant.contents = newContents
    this.updateAll()
  }

  //  Update contents. For update requset.
  @action.bound
  updateContents(contents: SharedContent[]) {
    contents.forEach((content) => {
      const contentOwner = this.owner.get(content.id)

      if (contentOwner) {
        const participant = this.participants.get(contentOwner)
        console.log('myContents=', JSON.stringify(participant?.contents))
        console.log('updateContents for participant=', contentOwner, ' ', JSON.stringify(content))

        participant?.contents.set(content.id, content)
      }else {
        console.log('unpdateContents called for ', content.id, ' with invalid owner pid=', contentOwner)
      }
    })
    this.updateAll()
  }

  //  Remove contents when the content is owned by local participant
  @action.bound
  removeContents(pid: string, cids: string[]) {
    const participant = this.participants.get(pid)
    if (participant) {
      // remove them from myContents
      const my = new Map<string, SharedContent>(participant.contents)
      cids.forEach(cid => my.delete(cid))
      participant.contents = my
      this.updateAll()
      if (pid !== this.localId) {
        const newRemoveRequest = new Set<string>(this.removeRequests)
        cids.forEach(cid => newRemoveRequest.add(cid))
        this.removeRequests = newRemoveRequest
        console.log('removeContents update remove request', newRemoveRequest)
      }
      console.log('removeContents cids=', cids, ' all=', this.contents.length, this.contents)
    }else {
      console.log('removeContents failed to find pid=', pid)
    }
  }

  //  If I'm the next, obtain the contents
  @action.bound
  onParticipantLeft(pidLeave:string) {
    console.log('onParticipantLeft called with pid = ', pidLeave)
    const participantLeave = this.participants.get(pidLeave)
    if (participantLeave) {
      const allPids = Array.from(participantsStore.remote.keys())
      allPids.push(this.localId)
      allPids.sort()
      const idx = allPids.findIndex(cur => cur > pidLeave)
      const next = allPids[idx >= 0 ? idx : 0]
      console.log('next = ', next)
      if (next === this.localId) {
        console.log('Next is me')
        const myContents = new Map<string, SharedContent>(this.localParticipant.contents)
        participantLeave.contents.forEach((c, cid) => {
          myContents.set(cid, c)
          this.owner.set(cid, this.localId)
          console.log('set owner for cid=', cid, ' pid=', this.localId)
        })
        this.removeParticipant(pidLeave)
        console.log('remove:', pidLeave, ' current:', JSON.stringify(allPids))
        console.log('local contents sz:', myContents.size, ' json:', JSON.stringify(Array.from(myContents.keys())))
        this.localParticipant.contents = myContents
        this.updateAll()
      }else {
        console.log('Next is remote')
        this.leavingParticipants.set(pidLeave, participantLeave)
      }
    }
  }

  @action.bound
  private removeParticipant(pid:string) {
    const participant = this.participants.get(pid)
    if (participant) {
      this.emit(SharedContentsEvents.REMOTE_LEAVE,  participant)
      this.participants.delete(pid)
      //  myContents will move to another participant and owner will be overwrite. So, no change on owner.
    }
  }

  getUniqueId(pid: string) {
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
    console.log('Error in getUniqueId()')

    return ''
  }
}
const sharedContents = new SharedContents()
export default sharedContents
