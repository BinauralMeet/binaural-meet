import {Footer} from '@components/footer/Footer'
import {StoreProvider} from '@hooks/ParticipantsStore'
import {Participants} from '@stores/participants/Participants'
import {addFakeParticipants} from '@test-utils/store'
import React from 'react'

const FooterStory: React.FC<{}> = () => {
  const store = new Participants()
  addFakeParticipants(store)

  return <StoreProvider value={store}>
    <Footer />
  </StoreProvider>
}

export default FooterStory
