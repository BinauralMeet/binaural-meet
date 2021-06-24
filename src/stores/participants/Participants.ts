import {action, computed, makeObservable, observable} from 'mobx'
import {LocalParticipant} from './LocalParticipant'
import {RemoteParticipant} from './RemoteParticipant'

export class Participants {
  constructor() {
    makeObservable(this)
  }

  @observable.shallow readonly remote = new Map<string, RemoteParticipant>()
  local_ = observable.box(new LocalParticipant())

  @observable.shallow readonly yarnPhones = new Set<string>()

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
    this.local.id = id
  }

  @action
  join(participantId: string) {
    //  console.debug(`${participantId} join`)
    const newParticipant = new RemoteParticipant(participantId)
    newParticipant.physics.located = false
    this.remote.set(participantId, newParticipant)
  }

  @action
  leave(participantId: string) {
    this.remote.delete(participantId)
  }

  @action leaveAll(){
    this.remote.clear()
    this.setLocalId('')
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
