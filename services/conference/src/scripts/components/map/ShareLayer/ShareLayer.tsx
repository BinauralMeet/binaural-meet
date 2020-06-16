import {useObserver} from 'mobx-react-lite'
import {makeStyles} from '@material-ui/core/styles'
import React from 'react'
import {SharedContent} from './SharedContent'
import {PastedContent} from './PastedContent'
import {useStore, StoreProvider as ContentsProvider} from '@hooks/SharedContentsStore'
import sharedContentsStore from '@stores/SharedContents'

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
  const sharedContents = contents.map((val) =>
    <SharedContent key={val[0]} content={val[1]} contents={store}/>)
  return(
    <div className={classes.slContainer} >
      {sharedContents}
      <PastedContent/>
    </div>
  )
}
SharedContents.displayName = 'SharedContents'


export const ShareLayer:  React.FC<{}> = () => {
  return(
    <ContentsProvider value={sharedContentsStore}>
      <SharedContents/>
    </ContentsProvider>
  )
}

ShareLayer.displayName = 'ShareLayer'
