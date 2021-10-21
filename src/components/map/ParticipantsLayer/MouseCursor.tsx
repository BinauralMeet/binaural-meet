import {BMProps} from '@components/utils'
import {Tooltip} from '@material-ui/core'
import {ParticipantBase} from '@stores/participants/ParticipantBase'
import {useObserver} from 'mobx-react-lite'
import React from 'react'

interface MouseCursorProps extends BMProps{
  participantId: string
}


export const MouseCursor: React.FC<MouseCursorProps> = (props:MouseCursorProps) => {
  const participants = props.stores.participants
  const participant = participants.find(props.participantId) as ParticipantBase
  const position = useObserver(() => participant.mouse.position)
  const name = useObserver(() => participant.information.name)
  const [color] = participant.getColor()
  if (!position) {
    return <div />
  }
  const isLocal = props.participantId === participants.localId

  const cursor = <div style={{width:18, height:30, left:position[0], top:position[1], position:'absolute',
    pointerEvents: isLocal ? 'none' : 'auto',
  }}>
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 100">
      <polygon points="32,100 53,92 36,57 60,56 0,0 0,81 16,65 32,100" stroke="black" fill={color} strokeWidth="6" />
    </svg>
  </div>

  return isLocal ? cursor
    :<Tooltip title={name}>{cursor}</Tooltip>
}
