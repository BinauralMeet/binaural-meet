import {MapObject} from './MapObject'

export interface Participant extends MapObject{
  id: string
  information: Information
  stream: Stream
  physics?: Physics
}

export interface Pose3DAudio {  // right hand cartesian coordinate system
  position: [number, number, number],
  orientation: [number, number, number],
}

export interface Information {
  name: string
  email?: string
  md5Email?: string
  avatarSrc?: string
}

export interface Stream {
  audioStream: MediaStream | undefined
  avatarStream: MediaStream | undefined
  screenStream: MediaStream | undefined
}

export interface Physics {
  onStage: boolean
}
