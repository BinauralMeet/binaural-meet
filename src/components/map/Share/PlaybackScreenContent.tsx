import {makeStyles} from '@material-ui/core/styles'
import {assert, seekMediaElement} from '@models/utils'
import React, {useEffect, useRef} from 'react'
import {ContentProps} from './Content'
import {autorun} from 'mobx'
import playbackStore from '@stores/sharedContents/PlaybackStore'
import {MediaClip} from '@stores/media/MediaClip'
import { recLog, PLAYBACK_RETRY_POLL_MS } from '@models/recorder/RecorderTypes'

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
  const refSeekPromise = useRef<Promise<void>>(Promise.resolve())
  const refSeekRevision = useRef(0)

  function updateClip(){
    const playingClip = refPlayingClip.current
    const clip = playbackStore.playbackClips.get(props.content.id)
    const video = ref.current
    if (video && clip){
      const videoBlobChanged = !!clip.videoBlob && clip.videoBlob !== playingClip?.videoBlob
      let seekPromise: Promise<void>|undefined
      const playFunc = (revision = refSeekRevision.current) => {
        refSeekPromise.current.then(() => {
          if (revision !== refSeekRevision.current) { return }
          const currentClip = playbackStore.playbackClips.get(props.content.id)
          if (currentClip?.pause) { return }
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
            refTimeout.current = window.setTimeout(() => playFunc(revision), PLAYBACK_RETRY_POLL_MS)
          })
        })
      }
      if (videoBlobChanged){
        video.src = URL.createObjectURL(clip.videoBlob!)
        video.playbackRate = clip.rate
      }
      if (videoBlobChanged || clip.videoFrom !== playingClip?.videoFrom){
        refSeekRevision.current += 1
        seekPromise = seekMediaElement(video, (clip.videoFrom - clip.videoTime) / 1000.0)
        refSeekPromise.current = seekPromise
      }
      if (clip.rate !== playingClip?.rate){
        video.playbackRate = clip.rate
      }
      if (clip.pause !== playingClip?.pause){
        if (clip.pause){
          const pause = () => {
            if (refWaitPlay.current){
              window.clearTimeout(refTimeout.current)
              refTimeout.current = 0
              window.setTimeout(pause, PLAYBACK_RETRY_POLL_MS)
            }else{
              window.clearTimeout(refTimeout.current)
              refTimeout.current = 0
              video.pause()
              recLog(`C ${props.content.id} paused`)
            }
          }
          pause()
        }else{
          playFunc()
        }
      }else if (!clip.pause && seekPromise){
        playFunc()
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
