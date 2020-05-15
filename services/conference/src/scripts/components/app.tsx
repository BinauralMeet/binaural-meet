import {StoreProvider} from '@hooks/ParticipantsStore'
import participantsStore from '@stores/Participants'
import React from 'react'
import {Map} from './map/map'

export const App: React.FC<{}> = () => {
  return (
    <StoreProvider value={participantsStore}>
      <Map />
    </StoreProvider>
  )
}
