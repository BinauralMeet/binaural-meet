import {makeStyles} from '@material-ui/core/styles'
import React, {useCallback, useEffect, useRef} from 'react'

const useStyles = makeStyles({
  root: (props: StreamAvatarProps) => ({
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    width: props.size,
    height: props.size,
    borderRadius: (props.size || 0) / 2,
    overflow: 'hidden',
  }),
  videoLargerWidth: {
    height: '100%',
  },
  videoLargerHeight: {
    width: '100%',
  },
})

export interface StreamAvatarProps {
  stream: MediaStream
  size?: number
}

const setStream = (
  video: HTMLVideoElement,
  stream: MediaStream,
  videoLargerWidthClass: string,
  videoLargerHeightClass: string,
  ) => {
  video.srcObject = stream
  video.autoplay = true

  const settings = stream.getVideoTracks()[0].getSettings()
  if (settings.width !== undefined && settings.height !== undefined) {
    video.className = settings.width >= settings.height ? videoLargerWidthClass : videoLargerHeightClass
  } else {
    console.error('video stream width || height is undefined')
    video.className = videoLargerWidthClass
  }
}

export const StreamAvatar: React.FC<StreamAvatarProps> = (props: StreamAvatarProps) => {
  const classes = useStyles(props)
  const ref = useRef<HTMLVideoElement>(null)

  useEffect(
    () => {
      if (ref !== null && ref.current !== null) {
        setStream(ref.current, props.stream, classes.videoLargerWidth, classes.videoLargerHeight)
      }
    },
    [props.stream],
  )

  const videoRef = useCallback(
    (node: HTMLVideoElement | null) => {
      if (node !== null) {
        setStream(node, props.stream, classes.videoLargerWidth, classes.videoLargerHeight)
      }
    },
    [])

  const video = React.createElement('video', {
    ref: videoRef,
  })

  return <div className={classes.root}>{video}</div>
}

StreamAvatar.defaultProps = {
  size: 100,
}
