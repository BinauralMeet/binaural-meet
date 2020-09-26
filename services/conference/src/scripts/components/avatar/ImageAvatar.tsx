import {Information} from '@models/Participant'
import React from 'react'
import ReactAvatar from 'react-avatar'

export interface ImageAvatarProps {
  information: Information
  size?: number
  color: string
  textColor: string
}


export const ImageAvatar: React.FC<ImageAvatarProps> = (props: ImageAvatarProps) => {
  const size = props.size !== undefined ? `${props.size}px` : undefined
  console.log(`avatar = ${props.information.avatarSrc}`)

  return (
    <ReactAvatar style={{userSelect: 'none', userDrag: 'none'}}
      name={props.information.name}
      email={props.information.email}
      md5Email={props.information.md5Email}
      round={true}
      size={size}
      src={props.information.avatarSrc}
      color={props.color}
      fgColor={props.textColor}
    />
  )
}
ImageAvatar.displayName = 'ImageAvatar'
