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
    const avatarSrc = localStorage.getItem('avatarSrc')
    this.information.avatarSrc = avatarSrc ? avatarSrc : undefined
    const name = localStorage.getItem('name')
    this.information.name = name ? name : 'Anonymous'
    const email = localStorage.getItem('email')
    this.information.email = email ? email : undefined
  }
}
