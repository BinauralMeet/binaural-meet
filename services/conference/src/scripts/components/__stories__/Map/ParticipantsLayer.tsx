import {ParticipantsLayer} from '@components/map/ParticipantsLayer'
import {StoreProvider} from '@hooks/ParticipantsStore'
import {Participants} from '@stores/participants/Participants'
import {addFakeParticipants} from '@test-utils/store'
import React from 'react'

const ParticipantsLayerStory: React.FC<{}> = () => {
  const store = new Participants()
  addFakeParticipants(store)

  return <StoreProvider value={store}>
    <ParticipantsLayer />
  </StoreProvider>
}

export default ParticipantsLayerStory
