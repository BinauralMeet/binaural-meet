import {makeStyles} from '@material-ui/core/styles'
import {MediaClip} from '@stores/MapObject'
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
  clip?: MediaClip
  size?: number
  style?: any
  mirror?: boolean
}

function setStream(video: HTMLVideoElement, stream: MediaStream|undefined, clip: MediaClip|undefined,
  videoLargerWidthClass: string, videoLargerHeightClass: string){
  if (stream) {
    video.srcObject = stream
    video.play()
  } else if (clip && clip.videoBlob && clip.videoBlob.size){
    const url = URL.createObjectURL(clip.videoBlob)
    video.src = url
    video.playbackRate = clip.rate
    video.currentTime = (clip.timeFrom - clip.videoTime) / 1000.0
    if (clip.pause) video.pause()
    else video.play()
  }

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

  video.onended = (ev) => {
    delete clip?.videoBlob
  }
}

export const StreamAvatar: React.FC<StreamAvatarProps> = (props: StreamAvatarProps) => {
  const classes = useStyles(props)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(
    () => {
      if (videoRef?.current !== null) {
        setStream(videoRef.current, props.stream, props.clip,
                  classes.videoLargerWidth, classes.videoLargerHeight)
      }
    },
    [videoRef, classes.videoLargerWidth, classes.videoLargerHeight, props.stream, props.clip?.videoBlob],
  )

  return <div className={classes.root} style={props.style}>
    <video ref={videoRef} style={props.style} />
  </div>
}

StreamAvatar.defaultProps = {
  size: 100,
}
StreamAvatar.displayName = 'StreamAvatar'
