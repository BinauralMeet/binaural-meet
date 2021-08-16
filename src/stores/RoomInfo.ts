import {makeObservable, observable} from 'mobx'

export class RoomInfo{
  @observable password=''
  @observable newPassword=''
  @observable passMatched=false
  constructor() {
    makeObservable(this)
  }
}

export default new RoomInfo()
