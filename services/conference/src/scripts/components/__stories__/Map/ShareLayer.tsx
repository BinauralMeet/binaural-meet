import {PastedContent} from '@components/map/ShareLayer/PastedContent'
import {SharedContent} from '@components/map/ShareLayer/SharedContent'
import {StoreProvider as ContentsProvider} from '@hooks/SharedContentsStore'
import {makeStyles} from '@material-ui/core/styles'
import {SharedContent as ISharedContent} from '@models/SharedContent'
import {default as participantsStore} from '@stores/participants/Participants'
import {SharedContent as SharedContentStore} from '@stores/sharedContents/SharedContent'
import {SharedContents as SharedContentsStore} from '@stores/sharedContents/SharedContents'
import {useObserver} from 'mobx-react-lite'
import React from 'react'

export function addFakeSharedContents(store: SharedContentsStore) {
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
const useStyles = makeStyles({
  slContainer:{
    backgroundColor: 'rgba(255,0,0,0.2)',
    userDrag: 'none',
    userSelect: 'none',
  },
})

const ShareLayerStory: React.FC<{}> = () => {
  const store = new SharedContentsStore()
  addFakeSharedContents(store)
  const contents = useObserver(() =>
    store.all.map(val => <SharedContent key={val.id} content={val} />))
  const classes = useStyles()

  return (
    <ContentsProvider value={store}>
      <div className={classes.slContainer} >
        {contents}
        <PastedContent />
      </div>
    </ContentsProvider>
  )
}

export default ShareLayerStory
