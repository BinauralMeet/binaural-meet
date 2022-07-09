import React from 'react'
import {Participant, ParticipantProps} from './Participant'


export const PlaybackParticipant: React.FC<ParticipantProps> = (props) => {
  return <Participant {...props} isLocal={false} isPlayback={true}/>
}
