import React from 'react'
import {ImageAvatar, ImageAvatarProps} from './ImageAvatar'
import {StreamAvatar, StreamAvatarProps} from './StreamAvatar'

type ComposedAvatarProps = ImageAvatarProps & Partial<StreamAvatarProps> & { showVideo:boolean }

export const ComposedAvatar: React.FC<ComposedAvatarProps> = (props: ComposedAvatarProps) => {
  const {
    information,
    stream,
    showVideo,
    ...remainProps
  } = props

  if (!showVideo || stream === undefined || !stream.getVideoTracks()[0].enabled) {
    return <ImageAvatar information={information} {...remainProps} />
  }

  return <StreamAvatar stream={stream} {...remainProps} />
}
ComposedAvatar.displayName = 'ComposedAvatar'
