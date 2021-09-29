import {action, makeObservable, observable} from 'mobx'


export class RoomInfo{
  defaultBackgroundFill = [0xDF, 0xDB, 0xE5]
  defaultBackgroundColor = [0xB9, 0xB2, 0xC4]

  @observable roomProps = new Map<string, string>()
  @observable password=''
  @observable newPassword=''
  @observable passMatched=false
  @observable backgroundFill = this.defaultBackgroundFill
  @observable backgroundColor = this.defaultBackgroundColor
  constructor() {
    makeObservable(this)
  }
  @action onUpdateProp(key:string, val:string|undefined){
    if (val === undefined){
      this.roomProps.delete(key)
    }else{
      this.roomProps.set(key, val)
    }
    //  console.log(`onUpdateProp(${key}, ${val})`)
    switch(key){
      case 'backgroundFill': this.backgroundFill = val ? JSON.parse(val) : this.defaultBackgroundFill; break
      case 'backgroundColor': this.backgroundColor = val ? JSON.parse(val) : this.defaultBackgroundColor; break
    }
  }
}

export default new RoomInfo()
