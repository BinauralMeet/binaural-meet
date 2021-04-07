import {ParticipantBase} from './Participant'
import {SharedContent} from './SharedContent'
import {Terrain} from './Terrain'

export interface Room {
  id: string
  participants: {
    [key: string]: ParticipantBase,
  }
  terrain: Terrain
  sharedContents: {
    [key: string]: SharedContent,
  }
}
