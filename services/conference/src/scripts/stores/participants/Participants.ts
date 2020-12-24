import {action, computed, observable} from 'mobx'
import {LocalParticipant} from './LocalParticipant'
import {RemoteParticipant} from './RemoteParticipant'
export class Participants {
  @observable.shallow readonly remote = new Map<string, RemoteParticipant>()
  local_ = observable.box(new LocalParticipant(''))

  @computed get count(): number {
    return this.remote.size
  }

  @computed get local(): LocalParticipant {
    return this.local_.get()
  }

  @computed get localId(): string {
    return this.local.id
  }

  @action
  setLocalId(id: string) {
    const newLocal = new LocalParticipant(id)
    const oldLocal = this.local
    if (oldLocal) {
      //  copy parameters which should NOT send to remote.
      newLocal.remoteAudioLimit = oldLocal.remoteAudioLimit
      newLocal.remoteVideoLimit = oldLocal.remoteVideoLimit
    }
    this.local_.set(newLocal)
    if (oldLocal) {
      //  copy parameters which should send to remote.
      Object.assign(oldLocal, {id:newLocal.id})
      Object.assign(newLocal, oldLocal)
    }
  }

  @action
  join(participantId: string) {
    console.debug(`${participantId} join`)
    this.remote.set(participantId, new RemoteParticipant(participantId))
  }

  @action
  leave(participantId: string) {
    this.remote.delete(participantId)
  }

  find(participantId: string): LocalParticipant | RemoteParticipant | undefined {
    if (participantId === this.localId) {

      return this.local
    }

    const res = this.remote.get(participantId)

    return res
  }

  isLocal(participantId: string) {
    return participantId === this.localId
  }
}

const participants = new Participants()
declare const d:any
d.participants = participants
export default participants
