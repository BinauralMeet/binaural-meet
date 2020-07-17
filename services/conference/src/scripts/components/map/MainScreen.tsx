import {useStore as useContentsStore} from '@hooks/SharedContentsStore'
import {makeStyles} from '@material-ui/core'
import {useObserver} from 'mobx-react-lite'
import React, {useEffect, useRef} from 'react'

const useStyles = makeStyles({
  container: {
    height: '90%',
    width: '100%',
    transform:'none',
    backgroundColor: 'red',
    opacity: 0.2,
  },
  video:{
    margin: '0 auto',
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
  const tracks = useObserver(() => (store.mainTracks))
  const videoRef = useRef<HTMLVideoElement>(null)
  const track = (tracks && tracks.length) ? tracks[0] : undefined

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
