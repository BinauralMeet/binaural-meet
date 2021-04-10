import {makeObservable, observable} from 'mobx'

export class DevicePreference {
  constructor() {
    makeObservable(this)
  }
  [id: string]: string|undefined
  @observable audioInputDevice:string|undefined = undefined
  @observable videoInputDevice:string|undefined = undefined
  @observable audioOutputDevice:string|undefined = undefined
}
