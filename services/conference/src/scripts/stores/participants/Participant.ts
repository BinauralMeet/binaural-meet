import {Information, ParticipantBase as IParticipantBase, RemoteParticipant as IRemoteParticipant, Tracks} from '@models/Participant'
import {MapObject} from '@stores/MapObject'
import {shallowObservable, Store} from '../utils'
import {Plugins} from './plugins'

export class ParticipantBase extends MapObject implements Store<IParticipantBase> {
  readonly id: string
  information = shallowObservable<Information>({
    name: 'Name',
    email: undefined,
    md5Email: undefined,
    avatarSrc: undefined,
  })
  plugins: Plugins

  constructor(id: string) {
    super()
    this.id = id

    this.plugins = new Plugins(this)
  }
}
export class RemoteParticipant extends ParticipantBase implements Store<IRemoteParticipant> {
  tracks = shallowObservable<Tracks>({
    audio: undefined,
    avatar: undefined,
    screen: undefined,
  })
}
