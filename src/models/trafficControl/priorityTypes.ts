import {Pose2DMap} from '@models/utils'

export interface TrackInfo {
  pose: Pose2DMap,
  onStage: boolean,
}

export interface RemoteTrackInfo extends TrackInfo {
  endpointId: string,
  size: [number, number],
  offset: number,
  priority: number,
  muted: boolean,
}
