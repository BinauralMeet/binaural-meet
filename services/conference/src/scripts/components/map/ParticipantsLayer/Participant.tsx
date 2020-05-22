import {Avatar, AvatarProps} from '@components/avatar'
import {useStore} from '@hooks/ParticipantsStore'
import {memoComponent} from '@hooks/utils'
import {makeStyles} from '@material-ui/core/styles'
import {useObserver} from 'mobx-react-lite'
import React, {forwardRef} from 'react'
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
  }),
  avatar: (props: StyleProps) => ({
    position: 'absolute',
    left: `-${props.size / 2}px`,
    top: `-${props.size / 2}px`,
  }),
  pointerRotate: (props: StyleProps) => ({
    transform: `rotate(${props.orientation}deg)`,
  }),
  pointer: (props: StyleProps) => ({
    position: 'absolute',
    width: `${pointerAvatarRatio * props.size / 2}`,
    left: `-${pointerAvatarRatio * props.size / 2}px`,
    top: `-${pointerAvatarRatio * props.size / 2}px`,
  }),
})

export type ParticipantProps = Required<AvatarProps>

const RawParticipant: React.ForwardRefRenderFunction<
HTMLDivElement , React.PropsWithChildren<ParticipantProps>> = (props, ref) => {
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

  return (
    <div className={classes.root}>
      {props.children}
      <div className={classes.pointerRotate}>
        <Pointer className={classes.pointer} />
      </div>
      <div className={[classes.avatar, transform.counterRotationClass].join(' ')} ref={ref}>
        <Avatar {...props} />
      </div>
    </div>
  )
}

export const Participant = forwardRef(RawParticipant)
Participant.displayName = 'Participant'

export const MemoedParticipant = memoComponent(Participant, ['participantId', 'size'])
MemoedParticipant.displayName = 'MemorizedParticipant'
