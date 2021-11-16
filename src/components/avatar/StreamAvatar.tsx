import {makeStyles} from '@material-ui/core/styles'
import React, {useEffect, useRef} from 'react'

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
  videoLargerWidth: (props: StreamAvatarProps) => ({
    height: '100%',
    transform: `scale(${props.mirror ? -1 : 1}, 1)`,
  }),
  videoLargerHeight: (props: StreamAvatarProps) => ({
    width: '100%',
    transform: `scale(${props.mirror ? -1 : 1}, 1)`,
  }),
})

export interface StreamAvatarProps {
  stream?: MediaStream
  blob?: Blob
  size?: number
  style?: any
  mirror?: boolean
}

function setStream(video: HTMLVideoElement, stream: MediaStream|undefined, blob: Blob|undefined,
  videoLargerWidthClass: string, videoLargerHeightClass: string){
  if (stream) {video.srcObject = stream}
  else if (blob && blob.size){
    const url = URL.createObjectURL(blob)
    video.src = url
  }
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
      if (videoRef?.current !== null) {
        setStream(videoRef.current, props.stream, props.blob,
                  classes.videoLargerWidth, classes.videoLargerHeight)
      }
    },
    [videoRef, classes.videoLargerWidth, classes.videoLargerHeight, props.stream, props.blob],
  )

  return <div className={classes.root} style={props.style}>
    <video ref={videoRef} style={props.style} />
  </div>
}

StreamAvatar.defaultProps = {
  size: 100,
}
StreamAvatar.displayName = 'StreamAvatar'
