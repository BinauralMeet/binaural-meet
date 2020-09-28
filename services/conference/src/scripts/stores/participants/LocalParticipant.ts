import {LocalParticipant as ILocalParticipant, Tracks} from '@models/Participant'
import {JitsiLocalTrack} from 'lib-jitsi-meet'
import {action, observable} from 'mobx'
import {shallowObservable, Store} from '../utils'
import {DevicePreference} from './localPlugins'
import {ParticipantBase, TracksStore} from './ParticipantBase'
// config.js
declare const config:any                  //  from ../../config.js included from index.html

export class LocalParticipant extends ParticipantBase implements Store<ILocalParticipant> {
  devicePreference = new DevicePreference()
  tracks = shallowObservable<TracksStore<JitsiLocalTrack>>(new TracksStore())
  @observable useStereoAudio = false  //  will be override by url switch
  @observable thirdPersonView = config.thirdPersonView as boolean
  @action setThirdPersonView(tpv: boolean) { this.thirdPersonView = tpv }
  constructor(id: string) {
    super(id)
  }
}
