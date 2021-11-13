import {makeStyles} from '@material-ui/core/styles'
import {assert} from '@models/utils'
import React, {useEffect, useRef} from 'react'
import {ContentProps} from './Content'

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

  function setTrack() {
    if (ref.current) {
      ref.current.src = props.content.url
      ref.current.autoplay = true
    }
  }
  useEffect(() => {
    setTrack()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },        [ref.current])

  return <video className={classes.video} ref={ref} />
}
