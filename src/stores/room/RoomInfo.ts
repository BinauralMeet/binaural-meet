import { RoomLoginInfo } from '@models/conference/MediaMessages'
import {action, makeObservable, observable} from 'mobx'

//  The only room-property names ROOM_PROP messages currently carry and that this class reacts to.
//  ROOM_PROP itself stays an open [name, value] tuple (see DataConnection.ts/DataSync.ts) -- this
//  type only constrains the known/reactive subset handled by onUpdateProp's switch below.
export type RoomPropertyName = 'backgroundFill' | 'backgroundColor'

export class RoomInfo{
  defaultBackgroundFill = [0xDF, 0xDB, 0xE5]
  defaultBackgroundColor = [0xB9, 0xB2, 0xC4]

  @observable roomProps = new Map<string, string>()
  @observable.ref loginInfo?: RoomLoginInfo
  @observable isAdmin=false
  @observable backgroundFill = this.defaultBackgroundFill
  @observable backgroundColor = this.defaultBackgroundColor

  @observable loginEmail = ''     //  Email to login and enter room
  constructor() {
    makeObservable(this)
  }
  @action onUpdateProp(key:RoomPropertyName, val:string|undefined){
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

const roomInfo = new RoomInfo()
declare const d:any
d.roomInfo = roomInfo
export default roomInfo
