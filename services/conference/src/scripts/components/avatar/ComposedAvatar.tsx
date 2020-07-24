import React from 'react'
import {ImageAvatar, ImageAvatarProps} from './ImageAvatar'
import {StreamAvatar, StreamAvatarProps} from './StreamAvatar'

type ComposedAvatarProps = ImageAvatarProps & Partial<StreamAvatarProps>

export const ComposedAvatar: React.FC<ComposedAvatarProps> = (props: ComposedAvatarProps) => {
  const {
    information,
    stream,
    ...remainProps
  } = props
  console.log(`info.avatarSrc = ${information.avatarSrc}`)

  if (stream === undefined) {
    return <ImageAvatar information={information} {...remainProps} />
  }

  return <StreamAvatar stream={stream} {...remainProps} />
}
ComposedAvatar.displayName = 'ComposedAvatar'
