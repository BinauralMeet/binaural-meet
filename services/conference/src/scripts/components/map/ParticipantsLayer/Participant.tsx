import {Avatar, AvatarProps} from '@components/avatar'
import {useStore} from '@hooks/ParticipantsStore'
import {memoComponent} from '@hooks/utils'
import {makeStyles} from '@material-ui/core/styles'
import {action} from 'mobx'
import {useObserver} from 'mobx-react-lite'
import React, {useEffect, useRef, useState} from 'react'
import {addV, subV, useDrag, useGesture} from 'react-use-gesture'
import {useValue as useTransform} from '../utils/useTransform'

interface StyleProps {
  position: [number, number]
}

const useStyles = makeStyles({
  root: (props: StyleProps) => ({
    position: 'absolute',
    left: props.position[0],
    top: props.position[1],
  }),
})

type ParticipantProps = AvatarProps

const Participant: React.FC<ParticipantProps> = (props) => {
  const participants = useStore()
  const participant = participants.find(props.participantId)
  const position = useObserver(() => {
    return participant.pose.position
  })
  const classes = useStyles({
    position,
  })

  const transform = useTransform()

  const container = useRef<HTMLDivElement>(null)

  if (participants.isLocal(participant.id)) {
    const bind = useGesture(
      {
        onDrag: ({down, delta, event}) => {
          if (down) {
            event?.stopPropagation()
            event?.preventDefault()
            participant.pose.position = addV(
              subV(transform.global2Local(delta), transform.global2Local([0, 0])), position)
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
  }

  return (
    <div className={[classes.root, transform.antiRotationClass].join(' ')} ref={container}>
      <Avatar {...props} />
    </div>
  )
}

export default memoComponent(Participant, ['participantId', 'size'])
