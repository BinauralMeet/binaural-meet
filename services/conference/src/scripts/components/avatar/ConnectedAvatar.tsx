import {useStore as usePsStore} from '@hooks/ParticipantsStore'
import {memoComponent} from '@hooks/utils'
import {ParticipantBase} from '@stores/participants/ParticipantBase'
import {useObserver} from 'mobx-react-lite'
import React from 'react'
import {ComposedAvatar} from './ComposedAvatar'

export interface ConnectedAvatarProps {
  participantId: string
  size?: number
}

const ConnectedAvatar: React.FC<ConnectedAvatarProps> = (props) => {
  const participantsStore = usePsStore()
  const participant = participantsStore.find(props.participantId) as ParticipantBase
  const [color, textColor] = participant.getColor()

  const {
    information,
    stream,
    showVideo,
  } = useObserver(() => {

    return {
      information: {...participant.information},
      stream: participant.tracks.avatarStream,
      showVideo: participant.plugins.streamControl.showVideo,
    }
  })

  return <ComposedAvatar information={information} stream={showVideo ? stream : undefined}
     color={color} textColor={textColor} size={props.size} style={{pointerEvents:'none'}} />
}

export const MemoedAvatar = memoComponent(ConnectedAvatar, ['participantId', 'size'])
MemoedAvatar.displayName = 'MemorizedAvatar'
