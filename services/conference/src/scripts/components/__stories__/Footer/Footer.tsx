import {Footer} from '@components/footer/Footer'
import {StoreProvider} from '@hooks/ParticipantsStore'
import mapData from '@stores/Map'
import {Participants} from '@stores/participants/Participants'
import sharedContents from '@stores/sharedContents/SharedContents'
import {addFakeParticipants} from '@test-utils/store'
import React from 'react'

const FooterStory: React.FC<{}> = () => {
  const store = new Participants()
  addFakeParticipants(store)

  return <StoreProvider value={store}>
    <Footer participants={store} contents={sharedContents} map={mapData} />
  </StoreProvider>
}

export default FooterStory
