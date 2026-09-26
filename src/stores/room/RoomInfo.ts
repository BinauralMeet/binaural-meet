import { RoomLoginInfo } from '@models/conference/MediaMessages'
import {action, makeObservable, observable} from 'mobx'

//  The only room-property names ROOM_PROP messages currently carry and that this class reacts to.
//  ROOM_PROP itself stays an open [name, value] tuple (see DataConnection.ts/DataSync.ts) -- this
//  type only constrains the known/reactive subset handled by onUpdateProp's switch below.
export type RoomPropertyName = 'backgroundFill' | 'backgroundColor' | 'stt'

export class RoomInfo{
  defaultBackgroundFill = [0xDF, 0xDB, 0xE5]
  defaultBackgroundColor = [0xB9, 0xB2, 0xC4]

  @observable roomProps = new Map<string, string>()
  @observable.ref loginInfo?: RoomLoginInfo
  @observable isAdmin=false
  @observable backgroundFill = this.defaultBackgroundFill
  @observable backgroundColor = this.defaultBackgroundColor
  //  Speech recognition is a property of the room, not of one participant: what it produces --
  //  everyone's words, as text, to everyone -- only makes sense as something the room does or
  //  does not do. Whether a given person wants to *see* the result is theirs alone
  //  (settings.showSubtitles), as is which language they read it in.
  @observable stt = false

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
      case 'stt': this.stt = val === 'true'; break
    }
  }
}

const roomInfo = new RoomInfo()
declare const d:any
d.roomInfo = roomInfo
export default roomInfo
