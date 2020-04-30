import {Participant} from './Participant'
import {Terrain} from './Terrain'

export interface Room {
  id: string
  participants: {
    [key: string]: Participant,
  }
  terrain: Terrain
}
