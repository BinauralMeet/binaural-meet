import {Room} from '@stores/Room'
import {makeObservable, observable} from 'mobx'

export class Rooms{
  @observable rooms: Set<Room> = new Set()

  constructor(){
    makeObservable(this)
  }
}

const rooms = new Rooms()
export default rooms
