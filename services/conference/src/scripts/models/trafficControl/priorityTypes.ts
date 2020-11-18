import {Pose2DMap} from '@models/MapObject'

export interface Props {
  ssrc: number,
  pose: Pose2DMap,
  onStage: boolean,
}

type Id = number

export interface Priority {
  video: Id[],
  audio: Id[],
}
