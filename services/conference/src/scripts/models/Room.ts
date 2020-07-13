import {Participant} from './Participant'
import {SharedContent} from './sharedContent/SharedContent'
import {Terrain} from './Terrain'

export interface Room {
  id: string
  participants: {
    [key: string]: Participant,
  }
  terrain: Terrain
  sharedContents: {
    [key: string]: SharedContent,
  }
}
