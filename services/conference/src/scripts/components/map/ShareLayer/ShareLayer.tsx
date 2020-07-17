import {StoreProvider as ContentsProvider, useStore} from '@hooks/SharedContentsStore'
import {makeStyles} from '@material-ui/core/styles'
import sharedContentsStore from '@stores/sharedContents/SharedContents'
import {useObserver} from 'mobx-react-lite'
import React from 'react'
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
    store.all.map(val => <SharedContent key={val.id} content={val} />))

  return(
    <div className={classes.slContainer} >
      {contents}
    </div>
  )
}
SharedContents.displayName = 'SharedContents'


export const ShareLayer:  React.FC<{}> = () => {
  return(
    <ContentsProvider value={sharedContentsStore}>
      <SharedContents />
      {/* TODO here paste content reference is deleted. Need handle paste event */}
    </ContentsProvider>
  )
}

ShareLayer.displayName = 'ShareLayer'
