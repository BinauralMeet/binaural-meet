export interface Participant {
  id: string
  pose: Pose2DMap
  information: Information
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
