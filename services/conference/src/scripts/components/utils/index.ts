import {MapData} from '@stores/Map'
import {Participants} from '@stores/participants/Participants'
import {SharedContents} from '@stores/sharedContents/SharedContents'
import i18n from 'i18next'

export interface Stores {
  map: MapData
  participants: Participants
  contents: SharedContents
}

export interface BaseProps extends Stores {
  transparent?: boolean
}
