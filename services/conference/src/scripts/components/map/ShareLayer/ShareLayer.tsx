import {useStore} from '@hooks/SharedContentStore'
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
  const classes = useStyles()
  const sharedContents = Array()
  sharedContentStore.order.forEach(val => sharedContents.push(<SharedContent content={val} /> ))
  return(
    <div className={classes.container} >
      {sharedContents}
      <PastedContent />
    </div>
  )
}
ShareLayer.displayName = 'ShareLayer'
