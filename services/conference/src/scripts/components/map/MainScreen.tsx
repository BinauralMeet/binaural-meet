import {useStore as useContentsStore} from '@hooks/SharedContentsStore'
import {makeStyles} from '@material-ui/core'
import {useObserver} from 'mobx-react-lite'
import React, {useEffect, useRef} from 'react'

const useStyles = makeStyles({
  container: {
    height: '90%',
    backgroundColor: 'red',
    opacity: 0.2,
    marginLeft: 'auto',
    marginRight: 'auto',
  },
  video:{
  },
})

const setStream = (
  video: HTMLVideoElement,
  stream: MediaStream | null,
  ) => {
  video.srcObject = stream
  video.autoplay = true
}

export const MainScreen: React.FC = () => {
  const classes = useStyles()
  const store = useContentsStore()
  const track = useObserver(() => (store.mainTrack))
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(
    () => {
      if (videoRef !== null && videoRef.current !== null) {
        setStream(videoRef.current, track ? track.getOriginalStream() : null)
      }
    },
    [track],
  )

  return (
    <div className={classes.container} >
      <video className={classes.video}
        ref={videoRef} style= {{visibility : track ? 'visible' : 'hidden', height:'100%'} } />
    </div>
  )
}
MainScreen.displayName = 'MainScreen'
