import Background from './Map/Base'
import Map from './Map/Map'
import ParticipantsLayer from './Map/ParticipantsLayer'
import ShareLayer from './Map/ShareLayer'

export default {
  title: 'Map',
}

export const base = Background

export const participantLayer = ParticipantsLayer

export const shareLayer = ShareLayer

export const map = Map
