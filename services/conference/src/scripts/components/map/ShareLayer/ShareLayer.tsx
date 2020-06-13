import {useStore} from '@hooks/SharedContentStore'
import {makeStyles} from '@material-ui/core/styles'
//import {useObserver} from 'mobx-react-lite'
import React, {useEffect, useState} from 'react'
import {SharedContent as SharedContentStore} from '@stores/SharedContent'
import {PastedContent, SharedContent} from './SharedContent'

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
  return(
    <div className={classes.container} >
      <PastedContent />
    </div>
  )
}
ShareLayer.displayName = 'ShareLayer'
