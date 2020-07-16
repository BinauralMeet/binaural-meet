import {LocalParticipant as ILocalParticipant, LocalTracks} from '@models/Participant'
import {observable} from 'mobx'
import {shallowObservable, Store} from '../utils'
import {DevicePreference} from './localPlugins'
import {ParticipantBase} from './Participant'

export class LocalParticipant extends ParticipantBase implements Store<ILocalParticipant> {
  devicePreference = new DevicePreference()
  tracks = shallowObservable<LocalTracks>({
    audio: undefined,
    avatar: undefined,
    screen: undefined,
  })

  @observable useStereoAudio = true

  constructor(id: string) {
    super(id)
  }
}
