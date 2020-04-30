import React from 'react'
import ReactAvatar from 'react-avatar'

import {Information} from '@models/Participant'

interface AvatarProps {
  information: Information
}

export const Avatar: React.SFC<AvatarProps> = (props: AvatarProps) => {
  return (
    <ReactAvatar
      name={props.information.name}
      email={props.information.email}
      md5Email={props.information.md5Email}
    />
  )
}
