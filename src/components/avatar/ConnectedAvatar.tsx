import {LocalParticipant} from '@stores/participants/LocalParticipant'
import {RemoteParticipant} from '@stores/participants/RemoteParticipant'
import {Observer} from 'mobx-react-lite'
import React from 'react'
import {AvatarProps} from '.'
import {ComposedAvatar} from './ComposedAvatar'

export interface ConnectedAvatarProps {
  participant: LocalParticipant | RemoteParticipant
  size: number
  isLocal: boolean
}

const ConnectedAvatar: React.FC<ConnectedAvatarProps> = (props) => {
  const participant = props.participant
  //  console.log('ConnectedAvatar is rendered.')

  return <Observer>{() => {
    const [color, textColor] = participant.getColor()

    return <ComposedAvatar information={{...participant.information}}
    stream={participant.plugins.streamControl.showVideo ? participant.tracks.avatarStream : undefined}
      color={color} textColor={textColor} size={props.size} style={{pointerEvents:'none'}}
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
    props.participant.information.email,
    props.participant.information.name,
    props.participant.information.textColor,
  ])
MemoedAvatar.displayName = 'MemorizedAvatar'
