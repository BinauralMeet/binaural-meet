import {useStore} from '@hooks/ParticipantsStore'
import {memoComponent} from '@hooks/utils'
import {makeStyles} from '@material-ui/core/styles'
import {useObserver} from 'mobx-react-lite'
import React from 'react'
import {DraggableCore, DraggableData, DraggableEvent, DraggableEventHandler} from 'react-draggable'
import {addV, subV} from 'react-use-gesture'
import {useValue as useTransform} from '../utils/useTransform'
import {Participant, ParticipantProps} from './Participant'

type LocalParticipantProps = ParticipantProps

const LocalParticipant: React.FC<LocalParticipantProps> = (props) => {
  const participants = useStore()
  const participant = participants.find(props.participantId)
  const participantProps = useObserver(() => ({
    position: participant.pose.position,
    orientation: participant.pose.orientation,
  }))

  const useStyles = makeStyles({
    local: () => ({
      '& .participantWrapper': {
        '& circle, & path': {
          stroke: '#e5da00',
        },
      },
    }),
  })

  const classes = useStyles()

  const transform = useTransform()

  const dragEventHandler: DraggableEventHandler = (e: DraggableEvent, data: DraggableData) => {
    e.stopPropagation()
    e.preventDefault()
    const delta: [number, number] = [data.deltaX, data.deltaY]
    participant.pose.position = addV(
      subV(transform.global2Local(delta), transform.global2Local([0, 0])), participantProps.position)
  }

  return (
    <DraggableCore handle=".draggableHandle, path" onDrag={dragEventHandler}>
      <div className={classes.local}>
        <Participant {...props} />
      </div>
    </DraggableCore>
  )
}

export const MemoedLocalParticipant = memoComponent(LocalParticipant, ['participantId', 'size'])
MemoedLocalParticipant.displayName = 'MemorizedLocalParticipant'
