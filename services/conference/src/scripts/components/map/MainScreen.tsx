import {useStore as useContentsStore} from '@hooks/SharedContentsStore'
import {makeStyles} from '@material-ui/core'
import {useObserver} from 'mobx-react-lite'
import React, {useEffect, useRef} from 'react'

const useStyles = makeStyles({
  videoContainer: {
    height: '90%',
    width: '100%',
    backgroundColor: 'none',
  },
  video:{
    marginLeft: 'auto',
    marginRight: 'auto',
    display: 'block',
    height: '100%',
    width: '100%',
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
  const stream = useObserver(() => (store.mainStream))
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(
    () => {
      if (videoRef && videoRef.current) {
        setStream(videoRef.current, stream ? stream : null)
      }
    },
    [stream],
  )

  return (
    <div className={classes.videoContainer} >
      <video ref={videoRef} className={classes.video} style={{visibility : stream ? 'visible' : 'hidden'} } />
    </div>
  )
}
MainScreen.displayName = 'MainScreen'
