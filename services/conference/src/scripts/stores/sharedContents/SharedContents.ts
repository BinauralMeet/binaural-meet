import {TheatersOutlined} from '@material-ui/icons'
import {ParticipantContents as IParticipantContents, SharedContent as ISharedContent} from '@models/SharedContent'
import {default as participantsStore} from '@stores/participants/Participants'
import _ from 'lodash'
import {computed, observable} from 'mobx'
import {SharedContent} from './SharedContent'

function contentComp(a:ISharedContent, b:ISharedContent) {
  return a.zorder - b.zorder
}

export class ParticipantContents implements IParticipantContents {
  participantId = ''
  @observable.deep myContents = new Map<string, SharedContent>()
  @observable.deep updateRequest = new Map<string, SharedContent>()
  @observable.deep removeRequest = new Set<string>()
}


export class SharedContents {
  //  All shared objects in Z order
  @observable.deep all: SharedContent[] = []
  //  contents by owner
  @observable.shallow participants: Map<string, ParticipantContents> = new Map<string, ParticipantContents>()

  @computed get localParticipant(): ParticipantContents {
    if (!participantsStore.localId) {
      console.log('Invalid local participant ID')
    }
    const p = this.participants.get(participantsStore.localId)
    if (!p) {
      const n = new ParticipantContents
      this.participants.set(participantsStore.localId, n)

      return n
    }

    return p
  }
  //  map from contentId to participantId
  owner: Map <string, string> = new Map<string, string>()

  private updateAll() {
    this.all.length = 0
    this.participants.forEach((participant) => {
      this.all.push(... participant.myContents.values())
    })
    this.all.slice().sort(contentComp)
  }
  //  add
  addLocalContent(c:SharedContent) {
    if (!participantsStore.localId) {
      console.log('addLocalContant() failed. Invalid Participant ID.')

      return
    }
    if (!c.id) { c.id = this.getUniqueId(participantsStore.localId) }
    this.localParticipant.myContents.set(c.id, c)
    this.owner.set(c.id, participantsStore.localId)
    this.updateAll()
  }
  //  replace contents of one participant. A content can be new one (add) or exsiting one (update).
  replaceContents(pid: string, cs:SharedContent[]) { //  entries = [pid, content][]
    if (pid === participantsStore.localId) {  //  this is for remote participant
      console.log('Error replaceContents called for local participant')

      return
    }

    //  prepare participantContents
    let participant = this.participants.get(pid)
    if (!participant) {
      participant = new ParticipantContents()
      this.participants.set(pid, participant)
    }

    //  Check remove request and remove it.
    const removed = new Map(participant.myContents)
    cs.forEach(c => removed.delete(c.id))
    removed.forEach(c => this.localParticipant.removeRequest.delete(c.id))

    //  Check update request and remove request
    cs.forEach((c) => {
      const updateReq = this.localParticipant?.updateRequest.get(c.id)
      if (updateReq && _.isEqual(c, updateReq)) {
        this.localParticipant?.updateRequest.delete(c.id)
      }
    })
    //  update contents
    removed.forEach((c) => {
      participant?.myContents.delete(c.id)
      this.owner.delete(c.id)
    })
    cs.forEach((c) => {
      this.owner.set(c.id, pid)
      participant?.myContents.set(c.id, c)
    })
    this.updateAll()
  }

  //  Update contents. For update requset.
  updateContents(cs: SharedContent[]) {
    cs.forEach((c) => {
      const pid = this.owner.get(c.id)
      if (pid) {
        const participant = this.participants.get(pid)
        participant?.myContents.set(c.id, c)
      }
    })
    this.updateAll()
  }

  //  Remove contents when the content is owned by local participant
  removeContents(cids: string[]) {
    cids.forEach((cid) => {
      const pid = this.owner.get(cid)
      if (pid) {
        this.participants.get(pid)?.myContents.delete(cid)
        const i = this.all.findIndex(c => c.id === cid)
        this.all.splice(i, 1)
      }
    })
  }

  private getUniqueId(pid: string) {
    if (!this.participants.has(pid)) {
      this.participants.set(pid, new ParticipantContents())
    }
    const participant = this.participants.get(pid)
    let number = 0
    participant?.myContents.forEach(c => {
      const n = Number(c.id.slice(c.id.indexOf('_') + 1))
      number = number > n ? number : n
    })

    return `${pid}_${String(number + 1)}`
  }
}
const sharedContents = new SharedContents()
export default sharedContents
