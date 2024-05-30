import React from 'react'
import {ConnectedImageAvatar} from './ImageAvatar'
import {StreamAvatar} from './StreamAvatar'
import { Participant } from '@models/Participant'
import { Observer } from 'mobx-react-lite'
import { PlaybackParticipant } from '@stores/participants/PlaybackParticipant'
import { LocalParticipant } from '@stores/participants/LocalParticipant'
import { RemoteParticipant } from '@stores/participants/RemoteParticipant'

export interface AvatarProps{
  participant: Participant
  size: number
  mirror?: boolean
}

export const ComposedAvatar: React.FC<AvatarProps> = (props: AvatarProps) => {
  return <Observer>{()=>{
    const hasVideo = (props.participant as LocalParticipant | RemoteParticipant).tracks?.avatarStream
      || (props.participant as unknown as PlaybackParticipant).clip?.videoBlob

    return hasVideo ? <StreamAvatar {...props} /> : <ConnectedImageAvatar {...props} />
  }}</Observer>
}
ComposedAvatar.displayName = 'ComposedAvatar'
