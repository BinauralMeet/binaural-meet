import {observable} from 'mobx'
import {Participant} from './Participant'

export class Participants {
  @observable participants = new Map<string, Participant>()

  join(participantId: string) {
    this.participants.set(participantId, new Participant(participantId))
  }

  leave(participantId: string) {
    this.participants.delete(participantId)
  }

  find(participantId: string) {
    return this.participants.get(participantId)
  }
}

export default new Participants()
