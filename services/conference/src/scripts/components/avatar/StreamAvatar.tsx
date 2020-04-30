import {makeStyles} from '@material-ui/core/styles'
import React, {useCallback} from 'react'

const useStyles = makeStyles({
  root: (props: StreamAvatarProps) => ({
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    width: props.size,
    height: props.size,
    borderRadius: (props.size || 0) / 2,
    overflow: 'hidden',
  }),
  videoLargerWidth: {
    height: '100%',
  },
  videoLargerHeight: {
    width: '100%',
  },
})

interface StreamAvatarProps {
  stream: MediaStream
  size?: number
}

export const StreamAvatar: React.FC<StreamAvatarProps> = (props: StreamAvatarProps) => {
  const classes = useStyles(props)

  const videoRef = useCallback(
    (node: HTMLVideoElement | null) => {
      if (node !== null) {
        node.srcObject = props.stream
        node.autoplay = true

        const settings = props.stream.getVideoTracks()[0].getSettings()
        if (settings.width !== undefined && settings.height !== undefined) {
          node.className = settings.width >= settings.height ? classes.videoLargerWidth : classes.videoLargerHeight
        } else {
          node.className = classes.videoLargerWidth
        }
      }
    },
    [props.stream])

  const video = React.createElement('video', {
    ref: videoRef,
  })

  return <div className={classes.root}>{video}</div>
}

StreamAvatar.defaultProps = {
  size: 100,
}
