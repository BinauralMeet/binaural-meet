export interface Participant {
  id: string
  pose: Pose
  information: Information
  perceptibility?: Perceptibility // TODO used for skip rendering for optimize performance
}

export interface Pose {
  position: [number, number]
  orientation: number
}

export interface Information {
  name: string
  email?: string
  md5Email?: string
}

export interface Perceptibility {
  visibility?: boolean
  audibility?: boolean
}
