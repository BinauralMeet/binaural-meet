import {Avatar, AvatarProps} from '@components/avatar'
import {useStore} from '@hooks/ParticipantsStore'
import {memoComponent} from '@hooks/utils'
import {makeStyles} from '@material-ui/core'
import {useObserver} from 'mobx-react-lite'
import React from 'react'

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

  return <div className={classes.root}>
    <Avatar {...props} />
  </div>
}

export default memoComponent(Participant, ['participantId', 'size'])
