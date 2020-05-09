import {ParticipantsLayer} from '@components/map/ParticipantsLayer'
import {StoreProvider} from '@hooks/ParticipantsStore'
import {Participants} from '@stores/Participants'
import React from 'react'

const ParticipantsLayerStory: React.FC<{}> = () => {
  const store = new Participants()

  return <StoreProvider value={store}>
    <ParticipantsLayer />
  </StoreProvider>
}

export default ParticipantsLayerStory

function addFakeParticipants(store: Participants) {
  const participantIds = [...Array<number>(10).keys()].map(id => `remote_${id}`)
}
