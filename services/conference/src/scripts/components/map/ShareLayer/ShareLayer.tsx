import {useObserver} from 'mobx-react-lite'
import {makeStyles} from '@material-ui/core/styles'
//import {useObserver} from 'mobx-react-lite'
import React, {useEffect, useState} from 'react'
import {SharedContent} from './SharedContent'
import {PastedContent} from './PastedContent'

import {useStore, StoreProvider as ContentsProvider} from '@hooks/SharedContentsStore'
import sharedContentsStore from '@stores/SharedContents'

const useStyles = makeStyles({
  container: {
    backgroundColor: 'red',
    position: 'relative',
    width: '100%',
    height: '100%',
    userDrag: 'none',
    userSelect: 'none',
  },
})
export const SharedContents: React.FC<{}> = () => {
  const store = useStore()
  const contents = useObserver(() => Array.from(store.order.values()))
  const classes = useStyles()
  const sharedContents = contents.map(val => <SharedContent content={val} />)
  return(
    <div className={classes.container} >
      {sharedContents}
      <PastedContent />
    </div>
  )
}
export const ShareLayer: React.FC<{}> = () => {
  return(
    <ContentsProvider value={sharedContentsStore}>
      <SharedContents />
    </ContentsProvider>
  )
}

ShareLayer.displayName = 'ShareLayer'
