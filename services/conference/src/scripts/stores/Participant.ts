import {Information, Participant as IParticipant, Pose} from '@models/Participant'
import {shallowObservable, Store} from './utils'

export class Participant implements Store<IParticipant> {
  id: string
  pose = shallowObservable<Pose>({
    position: [0, 0],
    orientation: 0,
  })
  information = shallowObservable<Information>({
    name: 'Name',
    email: undefined,
    md5Email: undefined,
  })

  constructor(id: string) {
    this.id = id
  }
}
