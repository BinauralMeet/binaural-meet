import React from 'react'
import {ImageAvatar, ImageAvatarProps} from './ImageAvatar'
import {StreamAvatar, StreamAvatarProps} from './StreamAvatar'

type ComposedAvatarProps = ImageAvatarProps & Partial<StreamAvatarProps>

export const ComposedAvatar: React.FC<ComposedAvatarProps> = (props: ComposedAvatarProps) => {
  const {
    information,
    track,
    ...remainProps
  } = props

  if (track === undefined) {
    return <ImageAvatar information={information} {...remainProps} />
  }

  return <StreamAvatar track={track} {...remainProps} />
}
ComposedAvatar.displayName = 'ComposedAvatar'
