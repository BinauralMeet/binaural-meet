import {useStore} from '@hooks/SharedContentStore'
import {useObserver} from 'mobx-react-lite'
import {makeStyles} from '@material-ui/core/styles'
//import {useObserver} from 'mobx-react-lite'
import React, {useEffect, useState} from 'react'
import {default as sharedContentStore} from '@stores/SharedContents'
import {SharedContent} from './SharedContent'
import {PastedContent} from './PastedContent'

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

export const ShareLayer: React.FC<{}> = () => {
  const store = useStore()
  const order = store.order
  console.log("order:", order)
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
ShareLayer.displayName = 'ShareLayer'
