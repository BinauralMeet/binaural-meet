import {LocalParticipant as ILocalParticipant, Tracks} from '@models/Participant'
import {JitsiLocalTrack} from 'lib-jitsi-meet'
import {observable} from 'mobx'
import {shallowObservable, Store} from '../utils'
import {DevicePreference} from './localPlugins'
import {ParticipantBase, TracksStore} from './ParticipantBase'

export class LocalParticipant extends ParticipantBase implements Store<ILocalParticipant> {
  devicePreference = new DevicePreference()
  tracks = shallowObservable<TracksStore<JitsiLocalTrack>>(new TracksStore())
  @observable useStereoAudio = true
  constructor(id: string) {
    super(id)
  }
}
