import React from 'react'
import {ImageAvatar, ImageAvatarProps} from './ImageAvatar'
import {StreamAvatar, StreamAvatarProps} from './StreamAvatar'

type ComposedAvatarProps = ImageAvatarProps & Partial<StreamAvatarProps>

export const ComposedAvatar: React.FC<ComposedAvatarProps> = (props: ComposedAvatarProps) => {
  const {
    name,
    avatarSrc,
    colors,
    stream,
    clip,
    ...remainProps
  } = props

  if (!stream && !clip?.videoBlob) {
    return <ImageAvatar name={name} colors={colors}
    avatarSrc={avatarSrc} {...remainProps} />
  }

  return <StreamAvatar stream={stream} clip={clip} {...remainProps} />
}
ComposedAvatar.displayName = 'ComposedAvatar'
