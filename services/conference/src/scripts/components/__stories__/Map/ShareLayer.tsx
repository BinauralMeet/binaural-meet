import {PastedContent} from '@components/map/ShareLayer/PastedContent'
import {SharedContents} from '@components/map/ShareLayer/ShareLayer'
import {StoreProvider as ContentsProvider} from '@hooks/SharedContentsStore'
import {SharedContent as ISharedContent} from '@models/SharedContent'
import {default as participantsStore} from '@stores/participants/Participants'
import {SharedContent as SharedContentStore} from '@stores/sharedContents/SharedContent'
import {SharedContents as SharedContentsStore} from '@stores/sharedContents/SharedContents'
import {useObserver} from 'mobx-react-lite'
import React from 'react'

function addFakeSharedContents(store: SharedContentsStore) {
  const sc: SharedContentStore = new SharedContentStore()
  Object.assign(sc, {
    type : 'img',
    url: 'https://i.gyazo.com/d05570612dbbe84c65dd684ef665606e.png',
    pose: {
      position: [100, 100],
      orientation: 0,
    },
    size: [100, 100],
    zorder : 0,
  })
  store.addLocalContent(sc)
}

const pc: ISharedContent = {
  id: 'new',
  type : 'img',
  url: 'https://i.gyazo.com/d05570612dbbe84c65dd684ef665606e.png', // 'Pasted text',
  pose: {
    position: [300, 100],
    orientation: 0,
  },
  size: [100, 100],
  zorder: 1,
  perceptibility: {
    audibility: true,
    coreContentVisibility: true,
    visibility: true,
  },
}

const ShareLayerStory: React.FC<{}> = () => {
  const store = new SharedContentsStore()
  addFakeSharedContents(store)

  return (
    <ContentsProvider value={store}>
      <SharedContents />
      <PastedContent content={pc} />
    </ContentsProvider>
  )
}

export default ShareLayerStory
