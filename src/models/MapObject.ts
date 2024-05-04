import {Pose2DMap} from '@models/utils/coordinates'
export interface MapObject {
  pose: Pose2DMap
}
export interface MediaClip{
  videoBlob?: Blob
  audioBlob?: Blob
  rate: number
  from: number
}
