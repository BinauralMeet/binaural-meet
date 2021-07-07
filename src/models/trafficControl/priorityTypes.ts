import {Pose2DMap} from '@models/MapObject'
import {JitsiRemoteTrack} from 'lib-jitsi-meet'

export interface TrackInfo {
  pose: Pose2DMap,
  onStage: boolean,
}

export interface RemoteTrackInfo extends TrackInfo {
  track: JitsiRemoteTrack,
  size: [number, number],
  offset: number,
  priority: number,
  muted: boolean,
}

type Id = number
