import {useStore} from '@hooks/ParticipantsStore'
import {memoComponent} from '@hooks/utils'
import React from 'react'
import {Participant, ParticipantProps} from './Participant'


const RemoteParticipant: React.FC<ParticipantProps> = (props) => {
  const participants = useStore()

  const onClick = (ev:React.MouseEvent<HTMLDivElement>) => {
    if (participants.directRemotes.has(props.participantId)) {
      participants.directRemotes.delete(props.participantId)
    }else {
      participants.directRemotes.add(props.participantId)
    }
  }

  return (
    <div onClick = {onClick}>
      <Participant {...props} />
    </div>
  )
}

export const MemoedRemoteParticipant = memoComponent(RemoteParticipant, ['participantId', 'size'])
MemoedRemoteParticipant.displayName = 'MemoedRemoteParticipant'
