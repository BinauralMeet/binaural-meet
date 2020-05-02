import {action, computed, observable} from 'mobx'
import {Participant} from './Participant'

export class Participants {
  @observable.shallow readonly remote = new Map<string, Participant>()
  local = new Participant('default_local_participant_id')

  @computed get count(): number {
    return this.remote.size
  }

  @action
  join(participantId: string) {
    this.remote.set(participantId, new Participant(participantId))
  }

  @action
  leave(participantId: string) {
    this.remote.delete(participantId)
  }

  find(participantId: string) {
    return this.remote.get(participantId)
  }
}

export default new Participants()
