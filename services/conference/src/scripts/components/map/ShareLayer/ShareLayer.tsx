import {useStore} from '@hooks/SharedContentsStore'
import {makeStyles} from '@material-ui/core/styles'
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

export const ShareLayer: React.FC<{}> = () => {
  const store = useStore()
  const classes = useStyles()
  const contents = useObserver(() =>
    store.all.map(val => <SharedContent key={val.id} content={val} />))

  return(
    <div className={classes.slContainer} >
      {contents}
      <PastedContent />
    </div>
  )
}
ShareLayer.displayName = 'ShareLayer'
