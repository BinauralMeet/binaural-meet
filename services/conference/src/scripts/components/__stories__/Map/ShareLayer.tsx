import {SharedContents} from '@components/map/ShareLayer/ShareLayer'
import {StoreProvider as ContentsProvider} from '@hooks/SharedContentsStore'
import {SharedContent as ISharedContent} from '@models/SharedContent'
import {ImgSharedContent} from '@stores/sharedContents/SharedContent'
import {SharedContents as SharedContentsStore} from '@stores/sharedContents/SharedContents'
import React from 'react'

function addFakeSharedContents(store: SharedContentsStore) {
  const sc = new ImgSharedContent('image_id')
  Object.assign(sc, {
    type : 'img',
    url: 'https://i.gyazo.com/d05570612dbbe84c65dd684ef665606e.png',
    pose: {
      position: [100, 100],
      orientation: 0,
    },
    size: [100, 100],
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
      {/* TODO here paste content reference is deleted. Need handle paste event */}
    </ContentsProvider>
  )
}

export default ShareLayerStory
