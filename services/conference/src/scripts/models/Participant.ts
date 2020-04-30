export interface Participants {
  [key: string]: Participant
}

export interface Participant {
  id: string
  pose: Pose
  information: Information
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
