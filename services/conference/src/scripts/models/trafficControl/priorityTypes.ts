import {Pose2DMap} from '@models/MapObject'

export interface Props {
  id: string,
  pose: Pose2DMap,
}

type Id = string

export interface Priority {
  video: Id[],
  audio: Id[],
}
