import {useStore as useContentsStore} from '@hooks/SharedContentsStore'
import {makeStyles} from '@material-ui/core'
import {useObserver} from 'mobx-react-lite'
import React, {useEffect, useRef} from 'react'

const useStyles = makeStyles({
  container: {
    height: '90%',
    backgroundColor: 'gray',
  },
  videoLargerWidth: {
    marginLeft: 'auto',
    marginRight: 'auto',
    display: 'block',
    height: '100%',
  },
  videoLargerHeight: {
    marginLeft: 'auto',
    marginRight: 'auto',
    display: 'block',
    width: '100%',
  },
})

const setStream = (
  video: HTMLVideoElement,
  stream: MediaStream | null,
  videoLargerWidthClass:string,
  videoLargerHeightClass:string,
  ) => {
  video.srcObject = stream
  video.autoplay = true
  video.onloadedmetadata = () => {
    const settings = {
      width: video.width,
      height: video.height,
    }

    if (settings.width !== undefined && settings.height !== undefined) {
      video.className = settings.width >= settings.height ? videoLargerWidthClass : videoLargerHeightClass
    } else {
      console.error('video stream width || height is undefined')
      video.className = videoLargerWidthClass
    }
  }
}

export const MainScreen: React.FC = () => {
  const classes = useStyles()
  const store = useContentsStore()
  const track = useObserver(() => (store.mainTrack))
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(
    () => {
      if (videoRef !== null && videoRef.current !== null) {
        setStream(videoRef.current, track ? track.getOriginalStream() : null,
                  classes.videoLargerWidth, classes.videoLargerHeight)
      }
    },
    [track],
  )

  return (
    <div className={classes.container} >
      <video ref={videoRef} style= {{visibility : track ? 'visible' : 'hidden'} } />
    </div>
  )
}
MainScreen.displayName = 'MainScreen'
