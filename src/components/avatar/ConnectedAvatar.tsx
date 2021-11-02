import {LocalParticipant} from '@stores/participants/LocalParticipant'
import { PlaybackParticipant } from '@stores/participants/PlaybackParticipant'
import {RemoteParticipant} from '@stores/participants/RemoteParticipant'
import {Observer} from 'mobx-react-lite'
import React from 'react'
import {AvatarProps} from '.'
import {ComposedAvatar} from './ComposedAvatar'

export interface ConnectedAvatarProps {
  participant: LocalParticipant | RemoteParticipant | PlaybackParticipant
  size: number
  isLocal: boolean
}

const ConnectedAvatar: React.FC<ConnectedAvatarProps> = (props) => {
  const participant = props.participant
  //  console.log('ConnectedAvatar is rendered.')

  return <Observer>{() => {
    const colors = participant.getColor()
    const {avatarSrc, name} = participant.information
    const args = {colors, avatarSrc, name}

    return <ComposedAvatar {...args}
      stream={participant.showVideo && !(participant instanceof PlaybackParticipant) ?
        participant.tracks.avatarStream : undefined}
      blob={participant.showVideo && (participant instanceof PlaybackParticipant) ?
        participant.videoBlob: undefined}
      colors={colors} size={props.size} style={{pointerEvents:'none'}}
      mirror={props.isLocal}
    />
  }}</Observer>
}

export const MemoedAvatar = (props: AvatarProps) =>
  React.useMemo(() => <ConnectedAvatar {...props} />,
  //  eslint-disable-next-line react-hooks/exhaustive-deps
  [props.size,
    props.participant.information.avatarSrc,
    props.participant.information.color,
    props.participant.information.name,
    props.participant.information.textColor,
  ])
MemoedAvatar.displayName = 'MemorizedAvatar'
