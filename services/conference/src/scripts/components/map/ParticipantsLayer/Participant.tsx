import {Avatar, AvatarProps} from '@components/avatar'
import {useStore} from '@hooks/ParticipantsStore'
import {memoComponent} from '@hooks/utils'
import {makeStyles} from '@material-ui/core/styles'
import {action} from 'mobx'
import {useObserver} from 'mobx-react-lite'
import React, {useEffect, useRef, useState} from 'react'
import {addV, subV, useDrag, useGesture} from 'react-use-gesture'
import {useValue as useTransform} from '../utils/useTransform'
import Pointer from './Pointer.svg'

const pointerAvatarRatio = 2

interface StyleProps {
  position: [number, number],
  orientation: number,
  size: number,
}

const useStyles = makeStyles({
  root: (props: StyleProps) => ({
    position: 'absolute',
    left: props.position[0],
    top: props.position[1],
    transform: `rotate(${props.orientation}deg)`,
  }),
  avatar: (props: StyleProps) => ({
    position: 'absolute',
    left: `-${props.size / 2}px`,
    top: `-${props.size / 2}px`,
  }),
  pointer: (props: StyleProps) => ({
    position: 'absolute',
    width: `${pointerAvatarRatio * props.size / 2}`,
    left: `-${pointerAvatarRatio * props.size / 2}px`,
    top: `-${pointerAvatarRatio * props.size / 2}px`,
  }),
})

type ParticipantProps = Required<AvatarProps>

const Participant: React.FC<ParticipantProps> = (props) => {
  const participants = useStore()
  const participant = participants.find(props.participantId)
  const participantProps = useObserver(() => ({
    position: participant.pose.position,
    orientation: participant.pose.orientation,
  }))
  const classes = useStyles({
    ...participantProps,
    size: props.size,
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
  }

  return (
    <div className={classes.root} ref={container}>
      <div className={classes.pointer}>
        <Pointer />
      </div>
      <div className={[classes.avatar, transform.antiRotationClass].join(' ')}>
        <Avatar {...props} />
      </div>
    </div>
  )
}

export const MemoedParticipant = memoComponent(Participant, ['participantId', 'size'])
MemoedParticipant.displayName = 'MemorizedParticipant'
