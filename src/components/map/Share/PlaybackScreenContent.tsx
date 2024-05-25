import {makeStyles} from '@material-ui/core/styles'
import {assert} from '@models/utils'
import React, {useEffect, useRef} from 'react'
import {ContentProps} from './Content'
import { autorun } from 'mobx'
import { IPlaybackContent } from '@models/ISharedContent'

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

  useEffect(() => {
    const content = props.content as IPlaybackContent
    if (ref.current && content.clip){
      ref.current.src = content.url
      ref.current.currentTime = content.clip.from / 1000.0
      ref.current.playbackRate = content.clip.rate
      ref.current.autoplay = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref.current, (props.content as IPlaybackContent).clip])

  return <video className={classes.video} ref={ref} />
}
