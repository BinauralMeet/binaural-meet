import {Information, ParticipantBase as IParticipantBase, RemoteParticipant as IRemoteParticipant, Tracks} from '@models/Participant'
import {MapObject} from '@stores/MapObject'
import {JitsiTrack} from 'lib-jitsi-meet'
import {computed, observable} from 'mobx'
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
  tracks = shallowObservable<TracksStore<JitsiTrack>>(new TracksStore<JitsiTrack>())

  constructor(id: string) {
    super()
    this.id = id
    this .plugins = new Plugins(this)
  }
}

export class TracksStore<T extends JitsiTrack> implements Tracks<T>{
  @observable.ref audio:T|undefined = undefined
  @observable.ref avatar:T|undefined = undefined
  @observable.ref screen:T|undefined = undefined
  @computed get audioStream() { return this.audio?.getOriginalStream() }
  @computed get avatarStream() { return this.avatar?.getOriginalStream() }
  @computed get screenStream() { return this.screen?.getOriginalStream() }
}
