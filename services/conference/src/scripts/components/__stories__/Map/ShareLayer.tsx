import {useObserver} from 'mobx-react-lite'
import {StoreProvider as ContentsProvider} from '@hooks/SharedContentsStore'
import React from 'react'
import {SharedContents as SharedContentsStore} from '@stores/SharedContents'
import {SharedContent as SharedContentStore} from '@stores/SharedContent'
import {SharedContents} from '@components/map/ShareLayer/ShareLayer'
import {SharedContent} from '@components/map/ShareLayer/SharedContent'
import {PastedContent} from '@components/map/ShareLayer/PastedContent'

function addFakeSharedContents(store: SharedContentsStore){
  const sc : SharedContentStore = new SharedContentStore()
  Object.assign(sc, {
    type : 'img',
    url: 'https://i.gyazo.com/d05570612dbbe84c65dd684ef665606e.png',
    pose: {
      position: [100,100],
      orientation: 0
    },
    size: [100,100]
  })
  store.order.set("test", sc)
}

const ShareLayerStory: React.FC<{}> = () => {
  const store = new SharedContentsStore()
  addFakeSharedContents(store)
  const contents = useObserver(() => Array.from(store.order.entries()))
  const sharedContents = contents.map((val) =>
    <SharedContent key={val[0]} content={val[1]} contents={store}/>)
  const pc = {
    type : 'img',
    url: 'https://i.gyazo.com/d05570612dbbe84c65dd684ef665606e.png', //'Pasted text',
    pose: {
      position: [300,100],
      orientation: 0
    },
    size: [100,100]
  }
  return (
    <ContentsProvider value={store}>
      <SharedContents />
      <PastedContent content={pc} />
    </ContentsProvider>
  )
}

export default ShareLayerStory
