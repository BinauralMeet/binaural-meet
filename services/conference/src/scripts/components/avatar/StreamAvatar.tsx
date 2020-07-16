import {makeStyles} from '@material-ui/core/styles'
import {JitsiTrack} from 'lib-jitsi-meet'
import React, {useCallback, useEffect, useRef} from 'react'

const CENTER = 0.5
const useStyles = makeStyles({
  root: (props: StreamAvatarProps) => ({
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    width: props.size,
    height: props.size,
//    borderRadius: (props.size || 0) / 2,
    clipPath: `circle(${(props.size || 0) * CENTER}px  at center)`,
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
  track: JitsiTrack
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

export const StreamAvatar: React.FC<StreamAvatarProps> = (props: StreamAvatarProps) => {
  const classes = useStyles(props)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(
    () => {
      if (videoRef !== null && videoRef.current !== null) {
        setStream(videoRef.current, props.track.getOriginalStream(),
                  classes.videoLargerWidth, classes.videoLargerHeight)
      }
    },
    [props.track],
  )

  useEffect(
    () => {
      if (videoRef !== null && videoRef.current !== null) {
        setStream(videoRef.current, props.track.getOriginalStream(),
                  classes.videoLargerWidth, classes.videoLargerHeight)
      }
    },
    [videoRef],
  )

  return <div className={classes.root}><video ref={videoRef} /></div>
}

StreamAvatar.defaultProps = {
  size: 100,
}
StreamAvatar.displayName = 'StreamAvatar'
