import {assert} from '@models/utils'
import {action, computed, observable} from 'mobx'
import {LocalParticipant} from './LocalParticipant'
import {ParticipantBase} from './ParticipantBase'
import {RemoteParticipant} from './RemoteParticipant'
export class Participants {
  @observable.shallow readonly remote = new Map<string, RemoteParticipant>()
  local = observable.box(new LocalParticipant('default_local_participant_id'))

  @computed get count(): number {
    return this.remote.size
  }

  @computed get localId(): string {
    return this.local.get().id
  }

  @action
  join(participantId: string) {
    console.log(`${participantId} join`)
    this.remote.set(participantId, new RemoteParticipant(participantId))
  }

  @action
  leave(participantId: string) {
    this.remote.delete(participantId)
  }

  @action
  resetLocal(participantId: string) {
    this.local.set(new LocalParticipant(participantId))
  }

  find(participantId: string): ParticipantBase | undefined {
    if (participantId === this.localId) {

      return this.local.get()
    }

    const res = this.remote.get(participantId)

    return res
  }

  isLocal(participantId: string) {
    return participantId === this.localId
  }
}

export default new Participants()
