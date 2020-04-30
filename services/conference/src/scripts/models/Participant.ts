export interface Participants {
  [key: string]: Participant
}

export interface Participant {
  id: string
  pose: Pose
}

export interface Pose {
  position: [number, number]
  orientation: number
}
