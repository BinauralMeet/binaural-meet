import {BaseProps} from '@components/utils'
import React from 'react'

import {useStore} from '@hooks/AppLevelStore'

import Fab from '@material-ui/core/Fab'
import {makeStyles} from '@material-ui/core/styles'
import MoreIcon from '@material-ui/icons/ExpandMore'
import MicIcon from '@material-ui/icons/Mic'
import MicOffIcon from '@material-ui/icons/MicOff'
import ScreenShareIcon from '@material-ui/icons/ScreenShare'
import VideoIcon from '@material-ui/icons/Videocam'
import VideoOffIcon from '@material-ui/icons/VideocamOff'
import {useObserver} from 'mobx-react-lite'

const useStyles = makeStyles((theme) => {
  return ({
    box: {
      position: 'absolute',
      bottom: 0,
      opacity: 0.1,
      '&:hover': {
        opacity: 1.0,
      },
    },
    margin: {
      margin: theme.spacing(1),
    },
  })
})


export const Footer: React.FC<BaseProps> = (props) => {
  const classes = useStyles()
  const store = useStore()

  return useObserver(() => (
    <div className={classes.box}>
      <Fab className={classes.margin} size = "small" color={store.micOn ? 'secondary' : 'primary'}
        aria-label="mic" onClick = { () => { store.micOn = !store.micOn }}>
        {store.micOn ? <MicIcon /> : <MicOffIcon /> }
      </Fab>
      <Fab className={classes.margin} size = "small" color={store.cameraOn ? 'secondary' : 'primary'}
         aria-label="camera"onClick = { () => { store.cameraOn = !store.cameraOn }}>
        {store.cameraOn ? <VideoIcon /> : <VideoOffIcon /> }
      </Fab>
      <Fab className={classes.margin} size = "small" color={store.screenShareOn ? 'secondary' : 'primary'}
        aria-label="share">
        <ScreenShareIcon />
      </Fab>
   </div>
  ))
}
Footer.displayName = 'Footer'
