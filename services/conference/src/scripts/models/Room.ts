import {Participants} from './Participant'
import {Terrain} from './Terrain'

export interface Room {
  id: string
  participants: Participants
  terrain: Terrain
}
