import {AvatarProps} from './ComposedAvatar'
import {makeStyles} from '@material-ui/core/styles'
import React, {useEffect, useRef} from 'react'

const CENTER = 0.5
const useStyles = makeStyles({
  root: (props: AvatarProps) => ({
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    width: props.size,
    height: props.size,
//    borderRadius: (props.size || 0) / 2,
    clipPath: `circle(${(props.size || 0) * CENTER}px  at center)`,
    overflow: 'hidden',
  }),
  videoLargerWidth: (props: AvatarProps) => ({
    height: '100%',
    transform: `scale(${props.mirror ? -1 : 1}, 1)`,
  }),
  videoLargerHeight: (props: AvatarProps) => ({
    width: '100%',
    transform: `scale(${props.mirror ? -1 : 1}, 1)`,
  }),
})

function setStream(video: HTMLVideoElement, stream: MediaStream|undefined,
  videoLargerWidthClass: string, videoLargerHeightClass: string){
  if (stream) {
    video.srcObject = stream
    video.play()
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
}

export const StreamAvatar: React.FC<AvatarProps> = (props: AvatarProps) => {
  const classes = useStyles(props)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (video){
      video.onloadedmetadata = () => {
        const settings = {
          width: video.width,
          height: video.height,
        }

        if (settings.width !== undefined && settings.height !== undefined) {
          video.className = settings.width >= settings.height ?
            classes.videoLargerWidth : classes.videoLargerHeight
        } else {
          console.error('video stream width || height is undefined')
          video.className = classes.videoLargerWidth
        }
      }
    }
  },[videoRef.current, classes.videoLargerWidth, classes.videoLargerHeight])
  useEffect(() => {
    const video = videoRef.current
    const tracks = props.participant.tracks
    if (video && tracks?.avatarStream) {
      if (video.srcObject !== tracks.avatarStream){
        console.log('StreamAvatar useEffect play()')
        video.srcObject = tracks.avatarStream
        video.play()
      }
    }
  },[videoRef.current, props.participant.tracks?.avatarStream])

  return <div className={classes.root}>
    <video ref={videoRef} />
  </div>
}

StreamAvatar.displayName = 'StreamAvatar'
