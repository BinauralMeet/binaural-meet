import {Control, Information, Participant as IParticipant, Perceptibility, Pose2DMap, Stream} from '@models/Participant'
import {shallowObservable, Store} from '../utils'
import {Plugins} from './plugins'

export class Participant implements Store<IParticipant> {
  readonly id: string
  pose = shallowObservable<Pose2DMap>({
    position: [0, 0],
    orientation: 0,
  })
  information = shallowObservable<Information>({
    name: 'Name',
    email: undefined,
    md5Email: undefined,
    avatarSrc: undefined,
  })
  perceptibility = shallowObservable<Perceptibility>({
    visibility: true,
    audibility: true,
  })
  stream = shallowObservable<Stream>({
    audioStream: undefined,
    avatarStream: undefined,
    screenStream: undefined,
  })
  control = shallowObservable<Control>({
    muteVideo: false,
    muteAudio: false,
    attenuation: 1,
  })
  plugins: Plugins

  constructor(id: string) {
    this.id = id

    this.plugins = new Plugins(this)
  }
}
