import React from 'react'
import ReactAvatar from 'react-avatar'

import {Information} from '@models/Participant'

export interface ImageAvatarProps {
  information: Information
  size?: number
}

export const ImageAvatar: React.FC<ImageAvatarProps> = (props: ImageAvatarProps) => {
  const size = props.size !== undefined ? `${props.size}px` : undefined

  return (
    <ReactAvatar
      name={props.information.name}
      email={props.information.email}
      md5Email={props.information.md5Email}
      round={true}
      size={size}
      src={props.information.avatarSrc}
    />
  )
}
