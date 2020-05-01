import {action, observable} from 'mobx'
import {Participant} from './Participant'

export class Participants {
  @observable participants = new Map<string, Participant>()

  @action
  join(participantId: string) {
    this.participants.set(participantId, new Participant(participantId))
  }

  @action
  leave(participantId: string) {
    this.participants.delete(participantId)
  }

  find(participantId: string) {
    return this.participants.get(participantId)
  }
}

export default new Participants()
