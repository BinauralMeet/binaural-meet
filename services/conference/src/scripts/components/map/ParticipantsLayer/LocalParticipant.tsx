import {useStore} from '@hooks/ParticipantsStore'
import {memoComponent} from '@hooks/utils'
import {makeStyles} from '@material-ui/core/styles'
import {useObserver} from 'mobx-react-lite'
import React, {useState} from 'react'
import {DraggableCore, DraggableData, DraggableEvent, DraggableEventHandler} from 'react-draggable'
import {addV, subV} from 'react-use-gesture'
import {useValue as useTransform} from '../utils/useTransform'
import {Participant, ParticipantProps} from './Participant'

function mulV<T extends number[]>(s: number, vec: T): T {
  return vec.map((v, i) => s * v) as T
}

type LocalParticipantProps = ParticipantProps

const LocalParticipant: React.FC<LocalParticipantProps> = (props) => {
  const participants = useStore()
  const participant = participants.find(props.participantId)
  const participantProps = useObserver(() => ({
    position: participant!.pose.position,
    orientation: participant!.pose.orientation,
  }))
  const thirdPersonView = useObserver(() => participants.local.get().thirdPersonView)

  const transform = useTransform()

  const [smoothedDelta, setSmoothedDelta] = useState<[number, number]>([0, 0])

  const dragEventHandler: DraggableEventHandler = (e: DraggableEvent, data: DraggableData) => {
    e.stopPropagation()
    e.preventDefault()
    if (thirdPersonView) {
      const delta: [number, number] = [data.deltaX, data.deltaY]
      const localDelta = subV(transform.global2Local(delta), transform.global2Local([0, 0]))
      participant!.pose.position = addV(participantProps.position, localDelta)
      const HALF_DEGREE = 180
      const WHOLE_DEGREE = 360
      const SMOOTHRATIO = 0.8
      setSmoothedDelta(addV(mulV(1 - SMOOTHRATIO, localDelta), mulV(SMOOTHRATIO, smoothedDelta)))
      const dir = Math.atan2(smoothedDelta[0], -smoothedDelta[1]) * HALF_DEGREE / Math.PI
      let diff = dir - participant!.pose.orientation
      if (diff < -HALF_DEGREE) { diff += WHOLE_DEGREE }
      if (diff > HALF_DEGREE) { diff -= WHOLE_DEGREE }
      const ROTATION_SPEED = 0.2
      participant!.pose.orientation += diff * ROTATION_SPEED
    } else {
      const delta: [number, number] = [data.deltaX, data.deltaY]
      participant!.pose.position = addV(
      subV(transform.global2Local(delta), transform.global2Local([0, 0])), participantProps.position)
    }
  }

  return (
    <DraggableCore handle=".draggableHandle, path" onDrag={dragEventHandler}>
      <div>
      <Participant {...props} />
      </div>
    </DraggableCore>
  )
}

export const MemoedLocalParticipant = memoComponent(LocalParticipant, ['participantId', 'size'])
MemoedLocalParticipant.displayName = 'MemorizedLocalParticipant'
