import {RemoteProducer} from '@models/conference/RtcConnection';
import {Pose2DMap} from '@models/utils'

export interface LocalObjectInfo {
  id: string,
  pose: Pose2DMap,
  onStage: boolean,
}

export interface RemoteObjectInfo extends LocalObjectInfo {
  producer: RemoteProducer,         //  remote producer
  size: [number, number],
  offset: number,
  priority: number,
  muted: boolean,
}
