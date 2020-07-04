import {assert} from '@models/utils'
import {action, computed, observable} from 'mobx'
import {LocalParticipant} from './LocalParticipant'
import {Participant} from './Participant'

export class Participants {
  @observable.shallow readonly remote = new Map<string, Participant>()
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
    this.remote.set(participantId, new Participant(participantId))
  }

  @action
  leave(participantId: string) {
    this.remote.delete(participantId)
  }

  @action
  resetLocal(participantId: string) {
    this.local.set(new LocalParticipant(participantId))
  }

  find(participantId: string): Participant {
    if (participantId === this.localId) {

      return this.local.get()
    }

    const res = this.remote.get(participantId)
    assert(res !== undefined)

    return res
  }

  isLocal(participantId: string) {
    return participantId === this.localId
  }
}

export default new Participants()
