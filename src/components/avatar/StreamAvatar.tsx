import {AvatarProps} from './ComposedAvatar'
import {makeStyles} from '@material-ui/core/styles'
import { autorun } from 'mobx'
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

  useEffect(
    () => {
      const video = videoRef?.current
      const tracks = props.participant.tracks
      if (video && tracks?.avatarStream) {
        setStream(videoRef.current, tracks.avatarStream,
                  classes.videoLargerWidth, classes.videoLargerHeight)
        video.srcObject = tracks.avatarStream
        video.play()
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
    },
    [videoRef, classes.videoLargerWidth, classes.videoLargerHeight, props.participant.tracks?.avatarStream],
  )
  useEffect(
    () => {
      const video = videoRef?.current
      if (video && props.participant.clip) {
        console.log(`autorun clip for StreamAvatar`)
        const clip = props.participant.clip
        const dispo = autorun(()=>{
          if (clip && clip.videoBlob && clip.videoBlob.size){
            const url = URL.createObjectURL(clip.videoBlob)
            video.src = url
            video.playbackRate = clip.rate
            video.currentTime = (clip.timeFrom - clip.videoTime) / 1000.0
            if (clip.pause) video.pause()
            else video.play()
          }
          video.onended = (ev) => {
            if (clip.videoBlob) delete clip.videoBlob
          }
        })
        return ()=>{dispo()}
      }
    },
    [videoRef?.current],
  )

  return <div className={classes.root}>
    <video ref={videoRef} />
  </div>
}

StreamAvatar.defaultProps = {
  size: 100,
}
StreamAvatar.displayName = 'StreamAvatar'
