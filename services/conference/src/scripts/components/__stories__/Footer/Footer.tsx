import {Footer} from '@components/footer/footer'
import {StoreProvider} from '@hooks/AppLevelStore'
import {AppLevel as AppLevelStore} from '@stores/AppLevel'

import React from 'react'

const FooterStory: React.FC<{}> = () => {
  const store = new AppLevelStore

  return <StoreProvider value={store}>
    <Footer />
  </StoreProvider>
}

export default FooterStory
