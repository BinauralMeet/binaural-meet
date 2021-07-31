import {Room} from '@stores/Room'
import {makeObservable, observable} from 'mobx'

export class Rooms{
  @observable rooms: Map<string, Room> = new Map()
  get(name: string){
    if (!this.rooms.has(name)){ this.rooms.set(name, new Room(name)) }

    return this.rooms.get(name)!
  }
  constructor(){
    makeObservable(this)
  }
  clear(){
    this.rooms = new Map()
  }
}

const rooms = new Rooms()
export default rooms
