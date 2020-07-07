import {observable} from 'mobx'
import {DevicePreference} from './localPlugins'
import {Participant} from './Participant'

export class LocalParticipant extends Participant {
  devicePreference = new DevicePreference()

  @observable useStereoAudio = true

  constructor(id: string) {
    super(id)
  }
}
