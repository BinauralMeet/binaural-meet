import {AvatarProps} from './ComposedAvatar'
import {makeStyles} from '@material-ui/core/styles'
import { MediaClip } from '@stores/MapObject'
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


export const ClipAvatar: React.FC<AvatarProps> = (props: AvatarProps) => {
  const classes = useStyles(props)
  const videoRef = useRef<HTMLVideoElement>(null)
  const prevClipRef = useRef<MediaClip|undefined>()

  useEffect(
    () => {
      const video = videoRef.current

      if (video && props.participant.clip) {
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

        const dispo = autorun(()=>{
          const clip = props.participant.clip
          const prev = prevClipRef.current

          const {audioBlob, videoBlob, ...clipLog} = {...clip}
          // console.log(`ClipAvatar autorun clip:${audioBlob?'A':' '}${videoBlob?'V':' '} ${JSON.stringify(clipLog)} `)

          if (clip && clip.videoBlob){
            if (clip.videoBlob !== prev?.videoBlob){
              //console.log('videoBlob set')
              const url = URL.createObjectURL(clip.videoBlob)
              video.src = url
            }
            if (clip.rate !== prev?.rate){
              video.playbackRate = clip.rate
            }
            if (clip.videoFrom !== prev?.videoFrom){
              const ct = (clip.videoFrom - clip.videoTime) / 1000.0
              if (ct < 0){
                clip.videoBlob = undefined
              }
              video.currentTime = ct
            }
            if (clip.pause !== prev?.pause){
              if (clip.pause) video.pause()
              else video.play()
            }
            prevClipRef.current = {...clip}
          }
        })
        video.onended = () => {
          //  console.log('onended called', props.participant.clip)
          const clip = props.participant.clip
          if (clip?.videoBlob){
            clip.videoBlob = undefined
          }
        }
        return ()=>{dispo()}
      }
    },
    [videoRef.current],
  )

  return <div className={classes.root}>
    <video ref={videoRef} />
  </div>
}

ClipAvatar.displayName = 'StreamAvatar'
