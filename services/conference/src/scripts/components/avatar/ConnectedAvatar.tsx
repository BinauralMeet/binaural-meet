import {useStore as usePsStore} from '@hooks/ParticipantsStore'
import {memoComponent} from '@hooks/utils'
import {LocalParticipant} from '@stores/participants/LocalParticipant'
import {RemoteParticipant} from '@stores/participants/Participant'
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
    track,
    showVideo,
  } = useObserver(() => {
    let track = undefined
    if (participant instanceof LocalParticipant) {
      track = participant.tracks.avatar
    }else if (participant instanceof RemoteParticipant) {
      track = participant.tracks.avatar
    }

    return {
      information: {
        name: participant.information.name,
        email: participant.information.email,
        md5Email: participant.information.md5Email,
      },
      track,
      showVideo: participant.plugins.streamControl.showVideo,
    }
  })

  return <ComposedAvatar information={information} track={showVideo ? track : undefined} size={props.size} />
}

export const MemoedAvatar = memoComponent(ConnectedAvatar, ['participantId', 'size'])
MemoedAvatar.displayName = 'MemorizedAvatar'
