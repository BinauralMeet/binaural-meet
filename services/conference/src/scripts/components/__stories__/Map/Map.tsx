import {Map} from '@components/map/map'
import {StoreProvider} from '@hooks/ParticipantsStore'
import {Participants} from '@stores/Participants'
import {addFakeParticipants} from '@test-utils/store'
import React from 'react'
import {useBaseStyles} from './utils'

const MapStory: React.FC<{}> = () => {
  const classes = useBaseStyles()

  const store = new Participants()
  addFakeParticipants(store, {
    count: 100,
    positionMax: 1000,
  })

  return <StoreProvider value={store}>
    <Map className={classes.root} />
  </StoreProvider>
}

export default MapStory
