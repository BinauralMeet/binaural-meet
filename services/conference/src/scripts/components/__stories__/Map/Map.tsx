import {Map} from '@components/map/map'
import {StoreProvider} from '@hooks/ParticipantsStore'
import {StoreProvider as ContentsProvider} from '@hooks/SharedContentsStore'
import {Participants} from '@stores/participants/Participants'
import {SharedContents as SharedContentsStore} from '@stores/sharedContents/SharedContents'
import {addFakeParticipants} from '@test-utils/store'
import React from 'react'
import {addFakeSharedContents} from './ShareLayer'

const MapStory: React.FC<{}> = () => {

  const store = new Participants()
  addFakeParticipants(store, {
    count: 100,
    positionMax: 1000,
  })
  const contentsStore = new SharedContentsStore()
  addFakeSharedContents(contentsStore)

  return <ContentsProvider value={contentsStore}>
    <StoreProvider value={store}>
      <Map />
    </StoreProvider>
  </ContentsProvider>
}

export default MapStory
