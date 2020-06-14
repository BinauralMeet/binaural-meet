import {Pose2DMap} from './Participant'
import {Terrain} from './Terrain'

export interface SharedContent {
  type: string  //  object type ('img', etc)
  url: string
  pose: Pose2DMap
  size: [number, number]
}
