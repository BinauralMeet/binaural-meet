import {StoreProvider} from '@hooks/ParticipantsStore'
import '@models/audio'
import store from '@stores/Participants'
import React from 'react'
import {Controller} from './components/Controller'
import {ParticipantsVisualizer} from './components/ParticipantsStoreVisualizer'

export default {
  title: 'Audio',
}

export const stereo: React.FC<{}> = () => {
  return (
    <StoreProvider value={store}>
      <Controller />
      <ParticipantsVisualizer />
    </StoreProvider>
  )
}
