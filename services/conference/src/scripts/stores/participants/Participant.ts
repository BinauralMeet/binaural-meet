import {Information, Participant as IParticipant, Stream} from '@models/Participant'
import {MapObject} from '@stores/MapObject'
import {shallowObservable, Store} from '../utils'
import {Plugins} from './plugins'

export class Participant extends MapObject implements Store<IParticipant> {
  readonly id: string
  information = shallowObservable<Information>({
    name: 'Name',
    email: undefined,
    md5Email: undefined,
    avatarSrc: undefined,
  })
  stream = shallowObservable<Stream>({
    audioStream: undefined,
    avatarStream: undefined,
    screenStream: undefined,
  })
  plugins: Plugins

  constructor(id: string) {
    super()
    this.id = id

    this.plugins = new Plugins(this)
  }
}
