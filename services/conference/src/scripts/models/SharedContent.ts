import {MapObject} from './MapObject'

export interface SharedContent extends MapObject {
  type: string  //  object type ('img', etc)
  url: string
  size: [number, number]
}
