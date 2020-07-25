import {SharedContents} from '@components/map/ShareLayer/ShareLayer'
import {StoreProvider as ContentsProvider} from '@hooks/SharedContentsStore'
import offlineClient from '@models/automerge/clients/offlineClient'
import {SharedContent as ISharedContent} from '@models/SharedContent'
import {SharedContents as SharedContentsStore} from '@stores/sharedContents/SharedContents'
import React from 'react'


function addFakeSharedContents(store: SharedContentsStore) {
  const content: ISharedContent = {
    id: 'local_shared_content',
    perceptibility: {
      visibility: true,
      coreContentVisibility: true,
      audibility: true,
    },
    type : 'img',
    url: 'https://i.gyazo.com/d05570612dbbe84c65dd684ef665606e.png',
    pose: {
      position: [100, 100],
      orientation: 0,
    },
    size: [100, 100],
  }
  store.addContent(content)
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
  perceptibility: {
    audibility: true,
    coreContentVisibility: true,
    visibility: true,
  },
}

const ShareLayerStory: React.FC<{}> = () => {
  const store = new SharedContentsStore('sharedContents', offlineClient)
  addFakeSharedContents(store)

  return (
    <ContentsProvider value={store}>
      <SharedContents />
    </ContentsProvider>
  )
}

export default ShareLayerStory
