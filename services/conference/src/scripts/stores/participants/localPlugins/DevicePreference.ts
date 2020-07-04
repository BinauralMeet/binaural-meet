import {observable} from 'mobx'

export class DevicePreference {
  @observable audioInputDevice = ''
  @observable videoInputDevice = ''
  @observable audioOutputDevice = ''
}
