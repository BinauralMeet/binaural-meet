import {makeStyles} from '@material-ui/core/styles'
import {assert} from '@models/utils'
import React, {useEffect, useRef} from 'react'
import {ContentProps} from './Content'
import {autorun} from 'mobx'
import sharedContents from '@stores/sharedContents/SharedContents'
import {MediaClip} from '@stores/MapObject'

const useStyles = makeStyles({
  video: {
    width: '100%',
    height: '100%',
  },
})

const initialMediaClip:MediaClip = {videoTime:0, audioTime:0, rate:1, timeFrom:0, pause:false}

export const PlaybackScreenContent: React.FC<ContentProps> = (props:ContentProps) => {
  assert(props.content.type === 'playbackScreen' || props.content.type === 'playbackCamera')
  const classes = useStyles()
  const ref = useRef<HTMLVideoElement>(null)
  const refPlayingClip = useRef<MediaClip>({...initialMediaClip})
  const playingClip:MediaClip = refPlayingClip.current

  function updateClip(){
    const clip = sharedContents.playbackClips.get(props.content.id)
    const video = ref.current
    if (video && clip){
      if (clip.videoBlob && clip.videoBlob !== playingClip.videoBlob){
        video.src = URL.createObjectURL(clip.videoBlob)
      }
      if (clip.timeFrom !== playingClip.timeFrom){
        video.currentTime = (clip.timeFrom - clip.videoTime) / 1000.0
      }
      if (clip.rate !== playingClip.rate){
        video.playbackRate = clip.rate
      }
      if (clip.pause !== playingClip.pause){
        if (clip.pause){
          video.autoplay = false
          video.pause()
        }else{
          video.autoplay = true
          video.play()
        }
      }
      Object.assign(playingClip, {...clip})
    }
  }

  useEffect(() => {
    const dispo = autorun(()=>{
      updateClip()
    })
    return ()=>{dispo()}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    updateClip()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref.current])

  return <video className={classes.video} ref={ref} />
}
