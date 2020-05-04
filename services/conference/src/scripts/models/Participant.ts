export interface Participant {
  id: string
  pose: Pose2DMap
  information: Information
  perceptibility: Perceptibility // used for skip rendering for optimizing performance
  stream: Stream
  physics?: Physics
}

export interface Pose2DMap {  // screen coordinate system
  position: [number, number]
  orientation: number
}

export interface Pose3DAudio {  // right hand cartesian coordinate system
  position: [number, number, number],
  orientation: [number, number, number],
}

export interface Information {
  name: string
  email?: string
  md5Email?: string
}

export interface Perceptibility {
  visibility?: boolean
  audibility: boolean
}

export interface Stream {
  stream: MediaStream | undefined
  videoTrackId: string | undefined
  audioTrackId: string | undefined
}

export interface Physics {
  onStage: boolean
}
