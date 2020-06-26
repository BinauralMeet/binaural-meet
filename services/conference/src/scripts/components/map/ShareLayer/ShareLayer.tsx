import {StoreProvider as ContentsProvider, useStore} from '@hooks/SharedContentsStore'
import {makeStyles} from '@material-ui/core/styles'
import sharedContentsStore from '@stores/SharedContents'
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
  const contents = useObserver(() => Array.from(store.order.entries()))
  const classes = useStyles()
  console.log('SharedContents:', contents)
  const sharedContents = contents.map(
    val => <SharedContent key={val[0]} mapKey={val[0]} content={val[1]} contents={store} />,
  )

  return(
    <div className={classes.slContainer} >
      {sharedContents}
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
