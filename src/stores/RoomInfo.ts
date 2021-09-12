import {action, makeObservable, observable} from 'mobx'

export class RoomInfo{
  @observable password=''
  @observable newPassword=''
  @observable passMatched=false
  @observable backgroundFill = [0xDF, 0xDB, 0xE5]
  @observable backgroundColor = [0xB9, 0xB2, 0xC4]
  constructor() {
    makeObservable(this)
  }
  @action onUpdateProp(key:string, val:string){
    switch(key){
      case 'backgroundFill': this.backgroundFill = JSON.parse(val); break
      case 'backgroundColor': this.backgroundColor = JSON.parse(val); break
    }
  }
}

export default new RoomInfo()
