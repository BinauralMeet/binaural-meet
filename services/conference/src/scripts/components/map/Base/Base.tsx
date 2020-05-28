import {BaseProps as BP} from '@components/utils'
import {useStore} from '@hooks/ParticipantsStore'
import {makeStyles} from '@material-ui/core/styles'
import {
  crossProduct, extractRotation, extractScaleX, multiply,
  radian2Degree, rotate90ClockWise, rotateVector2D, transformPoint2D, vectorLength, 
} from '@models/utils'
import {useObserver} from 'mobx-react-lite'
import React, {useEffect, useRef, useState} from 'react'
import {subV, useGesture} from 'react-use-gesture'
import {createValue, Provider as TransformProvider} from '../utils/useTransform'

interface StyleProps {
  matrix: DOMMatrixReadOnly,
  mouse: [number, number],
}

const useStyles = makeStyles({
  root: {
    position: 'relative',
    width: '100%',
    height: '100%',
  },
  transform: {
    position: 'absolute',
    transform: (props: StyleProps) => props.matrix.toString(),
  },
})

interface BaseProps extends BP {
  children?: React.ReactElement | React.ReactElement[]
}

const options = {
  minScale: 0.8,
  maxScale: 5,
}

export const Base: React.FC<BaseProps> = (props: BaseProps) => {
  const container = useRef<HTMLDivElement>(null)
  const participants = useStore()
  const localParticipantPosition = useObserver(() => participants.local.get().pose.position)

  const [mouse, setMouse] = useState<[number, number]>([0, 0])  // mouse position relative to container
  const [matrix, setMatrix] = useState<DOMMatrixReadOnly>(new DOMMatrixReadOnly())

  // changed only when event end, like drag end
  const [commitedMatrix, setCommitedMatrix] = useState<DOMMatrixReadOnly>(new DOMMatrixReadOnly())

  const bind = useGesture(
    {
      onDrag: ({down, delta, event, xy, buttons}) => {
        if (down) {
          event?.preventDefault()

          if (buttons === 1) {  // left mouse drag - translate map
            const diff = rotateVector2D(matrix.inverse(), delta)
            const newMatrix = matrix.translate(...diff)
            setMatrix(newMatrix)
          } else if (buttons === 2) {  // right mouse drag - rotate map
            const center = transformPoint2D(matrix, localParticipantPosition)
            const target = subV(xy, getContainerAnchor(container))
            const radius1 = subV(target, center)
            const radius2 = subV(radius1, delta)

            const cosAngle = crossProduct(radius1, radius2) / (vectorLength(radius1) * vectorLength(radius2))
            const flag = crossProduct(rotate90ClockWise(radius1), delta) > 0 ? -1 : 1
            const angle = Math.acos(cosAngle) * flag

            const changeMatrix = (new DOMMatrix()).rotateSelf(0, 0, radian2Degree(angle))

            const tm = (new DOMMatrix()).translate(
              ...subV([0, 0] as [number, number], center))
            const itm = (new DOMMatrix()).translateSelf(...center)

            const newMatrix = multiply([itm, changeMatrix, tm, matrix])
            setMatrix(newMatrix)

            participants.local.get().pose.orientation = -radian2Degree(extractRotation(newMatrix))
          }
        }
      },
      onContextMenu: event => event?.preventDefault(),
      onDragEnd: () => setCommitedMatrix(matrix),
      onPinch: ({da: [d, a], origin, event, memo}) => {
        event?.preventDefault()

        if (memo === undefined) {
          return [d, a]
        }

        const [md, ma] = memo

        const center = subV(origin as [number, number], getContainerAnchor(container))

        let scale = d / md
        scale = limitScale(Math.abs(extractScaleX(matrix)), scale)

        const changeMatrix = (new DOMMatrix()).scaleSelf(scale, scale, 1).rotateSelf(0, 0, a - ma)

        const tm = (new DOMMatrix()).translate(
          ...subV([0, 0] as [number, number], center))
        const itm = (new DOMMatrix()).translateSelf(...center)

        const newMatrix = multiply([itm, changeMatrix, tm, matrix])
        setMatrix(newMatrix)

        participants.local.get().pose.orientation = -radian2Degree(extractRotation(newMatrix))

        return [d, a]
      },
      onPinchEnd: () => setCommitedMatrix(matrix),
      onWheel: ({movement}) => {
        let scale = Math.pow(1.2, movement[1] / 1000)
        scale = limitScale(extractScaleX(matrix), scale)
        const newMatrix = matrix.scale(scale, scale, 1, ...transformPoint2D(matrix.inverse(), mouse))
        setMatrix(newMatrix)
      },
      onWheelEnd: () => setCommitedMatrix(matrix),
      onMove: ({xy}) => {
        setMouse(subV(xy, getContainerAnchor(container)))
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

  const relativeMouse = matrix.inverse().transformPoint(new DOMPoint(...mouse))
  const styleProps: StyleProps = {
    matrix,
    mouse: [relativeMouse.x, relativeMouse.y],
  }
  const classes = useStyles(styleProps)

  const transfromValue = createValue(commitedMatrix, getContainerAnchor(container))

  return (
    <div className={[classes.root, props.className].join(' ')} ref={container}>
      <TransformProvider value={transfromValue}>
        <div id="map-transform" className={classes.transform}>
          {props.children}
        </div>
      </TransformProvider>
    </div>
  )
}
Base.displayName = 'MapBase'

function limitScale(currentScale: number, scale: number): number {
  const targetScale = currentScale * scale

  if (targetScale > options.maxScale) {
    return options.maxScale / currentScale
  }

  if (targetScale < options.minScale) {
    return options.minScale / currentScale
  }

  return scale
}

function getContainerAnchor(container: React.RefObject<HTMLDivElement>): [number, number] {
  if (container.current === null) {
    return [0, 0]
  }
  const div = container.current

  return [div.offsetLeft, div.offsetTop]
}
