
export interface Pose2DMap {
  position: [number, number]
  orientation: number
}

export interface Perceptibility {
  visibility: boolean
  audibility: boolean
}

export interface MapObject {
  pose: Pose2DMap
  perceptibility: Perceptibility // used for skip rendering for optimizing performance
}
