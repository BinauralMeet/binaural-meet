import {useStore as usePsStore} from '@hooks/ParticipantsStore'
import {memoComponent} from '@hooks/utils'
import {useObserver} from 'mobx-react-lite'
import React from 'react'
import {ComposedAvatar} from './ComposedAvatar'

export interface ConnectedAvatarProps {
  participantId: string
  size?: number
}

const ConnectedAvatar: React.FC<ConnectedAvatarProps> = (props) => {
  const participant = usePsStore().find(props.participantId)

  const {
    information,
    stream,
  } = useObserver(() => {
    return {
      information: {
        name: participant.information.name,
        email: participant.information.email,
        md5Email: participant.information.md5Email,
      },
      stream: participant.stream.avatarStream,
    }
  })

  return <ComposedAvatar information={information} stream={stream} size={props.size} />
}

export const MemoedAvatar = memoComponent(ConnectedAvatar, ['participantId', 'size'])
MemoedAvatar.displayName = 'MemorizedAvatar'
