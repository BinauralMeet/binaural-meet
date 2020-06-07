import {Pose2DMap} from './Participant'
import {Terrain} from './Terrain'

export interface SharedObject {
  url: string
  pose: Pose2DMap
  size: Terrain
}
