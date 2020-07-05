import {Footer} from '@components/footer/footer'

import React from 'react'
import {StoreProvider} from '@hooks/ParticipantsStore'
import {Participants} from '@stores/participants/Participants'
import {addFakeParticipants} from '@test-utils/store'

const FooterStory: React.FC<{}> = () => {
  const store = new Participants()
  addFakeParticipants(store)

  return <StoreProvider value={store}>
    <Footer />
  </StoreProvider>
}

export default FooterStory
