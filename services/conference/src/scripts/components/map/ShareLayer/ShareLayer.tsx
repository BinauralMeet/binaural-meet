import {StoreProvider as ContentsProvider, useStore} from '@hooks/SharedContentsStore'
import {makeStyles} from '@material-ui/core/styles'
import {SharedContent as ISharedContent} from '@models/SharedContent'
import sharedContentsStore from '@stores/sharedContents/SharedContents'
import {useObserver} from 'mobx-react-lite'
import React from 'react'
import {PastedContent} from './PastedContent'
import {SharedContent} from './SharedContent'

const useStyles = makeStyles({
  slContainer:{
    backgroundColor: 'rgba(255,0,0,0.2)',
    userDrag: 'none',
    userSelect: 'none',
  },
})

export const SharedContents: React.FC<{}> = () => {
  const store = useStore()
  const classes = useStyles()
  const contents = useObserver(() =>
    store.content.renderOrder.map(
      id => <SharedContent key={id} content={store.content.contents[id] as ISharedContent} />))

  return(
    <div className={classes.slContainer} >
      {contents}
      <PastedContent />
    </div>
  )
}
SharedContents.displayName = 'SharedContents'


export const ShareLayer:  React.FC<{}> = () => {
  return(
    <ContentsProvider value={sharedContentsStore}>
      <SharedContents />
    </ContentsProvider>
  )
}

ShareLayer.displayName = 'ShareLayer'
