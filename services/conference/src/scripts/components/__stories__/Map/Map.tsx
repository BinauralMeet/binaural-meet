import {Map} from '@components/map/map'
import {StoreProvider} from '@hooks/ParticipantsStore'
import {StoreProvider as ContentsProvider} from '@hooks/SharedContentsStore'
import {Participants} from '@stores/participants/Participants'
import {SharedContents as SharedContentsStore} from '@stores/sharedContents/SharedContents'
import {addFakeParticipants} from '@test-utils/store'
import React from 'react'
import {addFakeSharedContents} from './ShareLayer'
import {useBaseStyles} from './utils'

const MapStory: React.FC<{}> = () => {
  const classes = useBaseStyles()

  const store = new Participants()
  addFakeParticipants(store, {
    count: 100,
    positionMax: 1000,
  })
  const contentsStore = new SharedContentsStore()
  addFakeSharedContents(contentsStore)

  return <ContentsProvider value={contentsStore}>
    <StoreProvider value={store}>
      <Map className={classes.root} />
    </StoreProvider>
  </ContentsProvider>
}

export default MapStory
