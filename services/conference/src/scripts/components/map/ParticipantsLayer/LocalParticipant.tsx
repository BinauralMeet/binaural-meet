import {useStore as useMapStore} from '@hooks/MapStore'
import {useStore} from '@hooks/ParticipantsStore'
import {memoComponent} from '@hooks/utils'
import React, {useRef} from 'react'
import {addV, subV} from 'react-use-gesture'
import {DragHandler, DragState} from '../../utils/DragHandler'
import {MAP_SIZE} from '../Base/Base'
import {useValue as useTransform} from '../utils/useTransform'
import {Participant, ParticipantProps} from './Participant'

const SPEED_LIMIT = 50


function mulV<T extends number[]>(s: number, vec: T): T {
  return vec.map((v, i) => s * v) as T
}

type LocalParticipantProps = ParticipantProps
interface LocalParticipantStatic{
  //  buttons: number
  //  xy: [number, number]
  smoothedDelta: [number, number]
  //  timer: NodeJS.Timeout | undefined
}
const LocalParticipant: React.FC<LocalParticipantProps> = (props) => {
  const participants = useStore()
  const participant = participants.find(props.participantId)
  const map = useMapStore()
  const transform = useTransform()
  const memo = useRef<LocalParticipantStatic>(new Object() as LocalParticipantStatic).current

  const moveParticipant = (state: DragState<HTMLDivElement>) => {
    //  move local participant
    let delta = subV(state.xy, map.toWindow(participant!.pose.position))
    const norm = Math.sqrt(delta[0] * delta[0] + delta[1] * delta[1])
    if (norm > SPEED_LIMIT) {
      delta = mulV(SPEED_LIMIT / norm, delta)
    }

    if (participants.local.get().thirdPersonView) {
      const localDelta = transform.rotateG2L(delta)
      participant!.pose.position = addV(participant!.pose.position, localDelta)
      const HALF_DEGREE = 180
      const WHOLE_DEGREE = 360
      const SMOOTHRATIO = 0.8
      if (!memo.smoothedDelta) { memo.smoothedDelta = [delta[0], delta[1]] }
      memo.smoothedDelta = addV(mulV(1 - SMOOTHRATIO, localDelta), mulV(SMOOTHRATIO, memo.smoothedDelta))
      const dir = Math.atan2(memo.smoothedDelta[0], -memo.smoothedDelta[1]) * HALF_DEGREE / Math.PI
      let diff = dir - participant!.pose.orientation
      if (diff < -HALF_DEGREE) { diff += WHOLE_DEGREE }
      if (diff > HALF_DEGREE) { diff -= WHOLE_DEGREE }
      const ROTATION_SPEED = 0.2
      participant!.pose.orientation += diff * ROTATION_SPEED
    } else {
      participant!.pose.position = addV(transform.rotateG2L(delta), participant!.pose.position)
    }
  }
  const scrollMap = () => {
    const posOnScreen = map.toWindow(participant!.pose.position)
    const target = [posOnScreen[0], posOnScreen[1]]
    const RATIO = 0.2
    const left = map.left + map.screenSize[0] * RATIO
    const right = map.left +  map.screenSize[0] * (1 - RATIO)
    const top = map.screenSize[1] * RATIO
    const bottom = map.screenSize[1] * (1 - RATIO)
    if (target[0] < left) { target[0] = left }
    if (target[0] > right) { target[0] = right }
    if (target[1] < top) { target[1] = top }
    if (target[1] > bottom) { target[1] = bottom }
    let diff = subV(posOnScreen, target) as [number, number]
    const norm = Math.sqrt(diff[0] * diff[0] + diff[1] * diff[1])
    const EPSILON = 1e-5
    if (norm > SPEED_LIMIT) {
      diff = mulV(SPEED_LIMIT / norm, diff) as [number, number]
    }
    const SCROOL_SPEED = 0.2
    const mapMove = mulV(SCROOL_SPEED, map.rotateFromWindow(diff) as [number, number])
    if (Math.abs(mapMove[0]) + Math.abs(mapMove[1]) > EPSILON) {
      const newMat = map.matrix.translate(-mapMove[0], -mapMove[1])
      const trans = map.rotateFromWindow([newMat.e, newMat.f])
      const HALF = 0.5
      let changed = false
      if (trans[0] < -MAP_SIZE * HALF) { trans[0] = -MAP_SIZE * HALF; changed = true }
      if (trans[0] > MAP_SIZE * HALF) { trans[0] = MAP_SIZE * HALF; changed = true }
      if (trans[1] < -MAP_SIZE * HALF) { trans[1] = -MAP_SIZE * HALF; changed = true }
      if (trans[1] > MAP_SIZE * HALF) { trans[1] = MAP_SIZE * HALF; changed = true }
      const transMap = map.rotateToWindow(trans);
      [newMat.e, newMat.f] = transMap
      map.setMatrix(newMat)
      map.setCommittedMatrix(newMat)

      return !changed
    }

    return false
  }
  const onTimer = (state:DragState<HTMLDivElement>) => {
    if (state.dragging) {
      onDrag(state)
    }
    const rv = scrollMap()
    //  console.log(`onTimer: drag:${state.dragging} again:${rv}`)

    return rv
  }
  const onDrag = (state:DragState<HTMLDivElement>) => {
    moveParticipant(state)
    scrollMap()
  }
  //  pointer drag
  const TIMER_INTERVAL = 33
  const drag = new DragHandler<HTMLDivElement>(onDrag, 'draggableHandle', onTimer, TIMER_INTERVAL)

  return (
    <div ref={drag.target} {...drag.bind()} >
    <Participant {...props} />
    </div>
  )
}

export const MemoedLocalParticipant = memoComponent(LocalParticipant, ['participantId', 'size'])
MemoedLocalParticipant.displayName = 'MemorizedLocalParticipant'
