import {Avatar, AvatarProps} from '@components/avatar'
import {useStore} from '@hooks/ParticipantsStore'
import {memoComponent} from '@hooks/utils'
import {makeStyles} from '@material-ui/core/styles'
import {useObserver} from 'mobx-react-lite'
import React from 'react'
import {useClass as useCounterRotationClass} from '../utils/counterRotation'

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
  const participant = useStore().find(props.participantId)
  const position = useObserver(() => {
    return participant.pose.position
  })
  const classes = useStyles({
    position,
  })

  const antiRotationClass = useCounterRotationClass()

  return <div className={[classes.root, antiRotationClass].join(' ')}>
    <Avatar {...props} />
  </div>
}

export default memoComponent(Participant, ['participantId', 'size'])
