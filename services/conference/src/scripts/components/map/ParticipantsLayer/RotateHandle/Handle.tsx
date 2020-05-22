import {makeStyles} from '@material-ui/core/styles'
import DragHandleIcon from '@material-ui/icons/DragHandle'
import React from 'react'
import {addV, subV, useGesture} from 'react-use-gesture'
import {useValue as useTransform} from '../../utils/useTransform'
import {useStore} from '@hooks/ParticipantsStore'
import {useObserver} from 'mobx-react-lite'

interface HandleProps {
  size: number,
  position: [number, number],
}

export const Handle: React.FC<HandleProps> = (props) => {
  const classes = useStyles(props)
  const transform = useTransform()

  const participants = useStore()
  const localPosition = useObserver(() => participants.find(participants.localId).pose.position)

  const bind = useDrag(([xy]) => {

  })

  return <DragHandleIcon className={classes.root} />
}
Handle.displayName = 'Handle'

const useStyles = makeStyles({
  root: (props: HandleProps) => ({
    position: 'absolute',
    width: props.size,
    height: props.size,
    left: props.position[0],
    top: props.position[1],
    transform: `translate(-${props.size / 2}px, -${props.size / 2}px)`,
  }),
})
