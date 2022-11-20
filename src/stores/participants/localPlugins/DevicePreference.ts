import {makeObservable, observable} from 'mobx'

export class DevicePreference {
  constructor() {
    makeObservable(this)
  }
  @observable audioinput:string|undefined = undefined
  @observable videoinput:string|undefined = undefined
  @observable audiooutput:string|undefined = undefined
}
