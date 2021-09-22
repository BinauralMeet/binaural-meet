import {ParticipantBase} from './Participant'
import {ISharedContent} from './ISharedContent'
import {Terrain} from './Terrain'

export interface Room {
  id: string
  participants: {
    [key: string]: ParticipantBase,
  }
  terrain: Terrain
  sharedContents: {
    [key: string]: ISharedContent,
  }
}
