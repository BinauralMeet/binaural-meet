import {Pose2DMap} from '@models/utils/coordinates'
export interface Perceptibility {
  visibility: boolean             // the whole object is visible
  coreContentVisibility: boolean  // core content (e.g. video stream for remote participant) is visible
  audibility: boolean             // the audio of object could be heard
}
export const defaultPerceptibility:Perceptibility = {
  visibility: true,
  coreContentVisibility: true,
  audibility: true,
}

export interface MapObject {
  pose: Pose2DMap
  perceptibility: Perceptibility // used for skip rendering for optimizing performance
}
