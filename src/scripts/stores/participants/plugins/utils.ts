import {ParticipantBase as IParticipantBase} from '@models/participant'
import {Store} from '@stores/utils'

export type ParentStoreBase = Store<IParticipantBase>

export class ParticipantStorePlugin {
  parent: ParentStoreBase

  constructor(parent: Store<IParticipantBase>) {
    this.parent = parent
  }
}
