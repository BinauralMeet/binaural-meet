import React from 'react'
import ReactAvatar from 'react-avatar'

import {Information} from '@models/Participant'

interface ImageAvatarProps {
  information: Information
}

export const ImageAvatar: React.FC<ImageAvatarProps> = (props: ImageAvatarProps) => {
  return (
    <ReactAvatar
      name={props.information.name}
      email={props.information.email}
      md5Email={props.information.md5Email}
      round={true}
    />
  )
}
