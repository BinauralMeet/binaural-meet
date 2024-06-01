import React from 'react'
import {ConnectedImageAvatar} from './ImageAvatar'
import {StreamAvatar} from './StreamAvatar'
import { Participant } from '@models/Participant'
import { Observer } from 'mobx-react-lite'
import { ClipAvatar } from './ClipAvatar'

export interface AvatarProps{
  participant: Participant
  size: number
  mirror?: boolean
}

export const ComposedAvatar: React.FC<AvatarProps> = React.memo((props: AvatarProps) => {
  return <Observer>{()=>{
    return props.participant.tracks?.avatarStream ? <StreamAvatar {...props} /> :
      props.participant.clip?.videoBlob ? <ClipAvatar {...props}/> :
       <ConnectedImageAvatar {...props} />
  }}</Observer>
})
ComposedAvatar.displayName = 'ComposedAvatar'
