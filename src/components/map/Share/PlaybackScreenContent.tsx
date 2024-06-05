import {makeStyles} from '@material-ui/core/styles'
import {assert} from '@models/utils'
import React, {useEffect, useRef} from 'react'
import {ContentProps} from './Content'
import {autorun} from 'mobx'
import sharedContents from '@stores/sharedContents/SharedContents'
import {MediaClip} from '@stores/MapObject'
import { recLog } from '@models/recorder/RecorderTypes'

const useStyles = makeStyles({
  video: {
    width: '100%',
    height: '100%',
  },
})

export const PlaybackScreenContent: React.FC<ContentProps> = (props:ContentProps) => {
  assert(props.content.type === 'playbackScreen' || props.content.type === 'playbackCamera')
  const classes = useStyles()
  const ref = useRef<HTMLVideoElement>(null)
  const refPlayingClip = useRef<MediaClip|undefined>(undefined)
  const refTimeout = useRef(0)
  const refWaitPlay = useRef(false)

  function updateClip(){
    const playingClip = refPlayingClip.current
    const clip = sharedContents.playbackClips.get(props.content.id)
    const video = ref.current
    if (video && clip){
      if (clip.videoBlob && clip.videoBlob !== playingClip?.videoBlob){
        video.src = URL.createObjectURL(clip.videoBlob)
      }
      if (clip.videoFrom !== playingClip?.videoFrom){
        video.currentTime = (clip.videoFrom - clip.videoTime) / 1000.0
      }
      if (clip.rate !== playingClip?.rate){
        video.playbackRate = clip.rate
      }
      //  console.log(`CCC pause=${clip.pause}, ${clip.pause!==playingClip?.pause?'Diff':'s'}`)
      if (clip.pause !== playingClip?.pause){
        if (clip.pause){
          const pause = () => {
            if (refWaitPlay.current){
              window.clearTimeout(refTimeout.current)
              refTimeout.current = 0
              window.setTimeout(pause, 100)
            }else{
              window.clearTimeout(refTimeout.current)
              refTimeout.current = 0
              video.pause()
              recLog(`C ${props.content.id} paused`)
            }
          }
          pause()
        }else{
          const playFunc = () => {
            refWaitPlay.current = true
            video.play().then(()=>{
              recLog(`C ${props.content.id} played`)
              refWaitPlay.current = false
              if (refTimeout.current){
                window.clearTimeout(refTimeout.current)
                refTimeout.current = 0
              }
            }).catch(()=>{
              refWaitPlay.current = false
              refTimeout.current = window.setTimeout(playFunc, 100)
            })
          }
          playFunc()
        }
      }
      refPlayingClip.current = {...clip}
    }
  }

  useEffect(() => {
    const dispo = autorun(()=>{
      updateClip()
    })
    return ()=>{
      if (refTimeout.current){
        window.clearTimeout(refTimeout.current)
        refTimeout.current = 0
      }
      dispo()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    updateClip()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref.current])

  return <video className={classes.video} ref={ref} />
}
