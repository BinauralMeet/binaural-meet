import {useStore} from '@hooks/ParticipantsStore'
import {memoComponent} from '@hooks/utils'
import {useObserver} from 'mobx-react-lite'
import React, {useEffect, useRef} from 'react'
import {addV, subV, useGesture} from 'react-use-gesture'
import {useValue as useTransform} from '../utils/useTransform'
import {Participant, ParticipantProps} from './Participant'
import {RotateHandle} from './RotateHandle'

type LocalParticipantProps = ParticipantProps

const LocalParticipant: React.FC<LocalParticipantProps> = (props) => {
  const participants = useStore()
  const participant = participants.find(props.participantId)
  const participantProps = useObserver(() => ({
    position: participant.pose.position,
    orientation: participant.pose.orientation,
  }))

  const transform = useTransform()

  const container = useRef<HTMLDivElement>(null)

  const bind = useGesture(
    {
      onDrag: ({down, delta, event}) => {
        if (down) {
          event?.stopPropagation()
          event?.preventDefault()
          participant.pose.position = addV(
            subV(transform.global2Local(delta), transform.global2Local([0, 0])), participantProps.position)
        }
      },
    },
    {
      domTarget: container,
      eventOptions: {
        passive: false,
      },
    },
  )
  useEffect(
    () => {
      bind()
    },
    [bind],
  )

  return (
    <Participant {...props} ref={container}>
      <RotateHandle size={props.size * 3} orientation={0} />
    </Participant>
  )
}

export const MemoedLocalParticipant = memoComponent(LocalParticipant, ['participantId', 'size'])
MemoedLocalParticipant.displayName = 'MemorizedLocalParticipant'
