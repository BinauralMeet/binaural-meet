import participants from '@stores/participants/Participants'
import React from 'react'
import {Participant, ParticipantProps} from './Participant'

const onClick = (ev:React.MouseEvent<HTMLDivElement>, id:string) => {
  if (participants.directRemotes.has(id)) {
    participants.directRemotes.delete(id)
  }else {
    participants.directRemotes.add(id)
  }
}

export const RemoteParticipant: React.FC<ParticipantProps> = (props) => {
  return (
    <div onClick = {(ev)=>onClick(ev, props.participant.id)}>
      <Participant {...props} isLocal={false}/>
    </div>
  )
}
