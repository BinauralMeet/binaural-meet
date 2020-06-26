import {Participant as IParticipant} from '@models/participant'
import {Store} from '@stores/utils'

export type ParentStore = Store<IParticipant>

export class ParticipantStorePlugin {
  parent: ParentStore

  constructor(parent: Store<IParticipant>) {
    this.parent = parent
  }
}
