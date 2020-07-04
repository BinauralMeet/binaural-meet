import {DevicePreference} from './localPlugins'
import {Participant} from './Participant'

export class LocalParticipant extends Participant {
  devicePreference = new DevicePreference()

  constructor(id: string) {
    super(id)
  }
}
