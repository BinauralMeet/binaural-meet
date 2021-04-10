import {useStore as usePsStore} from '@hooks/ParticipantsStore'
import {memoComponent} from '@hooks/utils'
import {ParticipantBase} from '@stores/participants/ParticipantBase'
import {Observer} from 'mobx-react-lite'
import React from 'react'
import {ComposedAvatar} from './ComposedAvatar'

export interface ConnectedAvatarProps {
  participantId: string
  size: number
}

const ConnectedAvatar: React.FC<ConnectedAvatarProps> = (props) => {
  const participantsStore = usePsStore()
  const participant = participantsStore.find(props.participantId) as ParticipantBase
  const [color, textColor] = participant.getColor()

  return <Observer>{() => <ComposedAvatar information={{...participant.information}}
    stream={participant.plugins.streamControl.showVideo ? participant.tracks.avatarStream : undefined}
     color={color} textColor={textColor} size={props.size} style={{pointerEvents:'none'}}
     mirror={participantsStore.isLocal(props.participantId)} />
    }</Observer>
}

export const MemoedAvatar = memoComponent(ConnectedAvatar, ['participantId', 'size'])
MemoedAvatar.displayName = 'MemorizedAvatar'
