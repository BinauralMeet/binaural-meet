import {BaseProps as BP} from '@components/utils'
import {useStore as useMapStore} from '@hooks/MapStore'
import {useStore} from '@hooks/ParticipantsStore'
import {makeStyles} from '@material-ui/core/styles'
import {
  crossProduct, extractRotation, extractScaleX,
  radian2Degree, rotate90ClockWise, rotateVector2D, transformPoint2D, transfromAt, vectorLength,
} from '@models/utils'
import {addV2, subV2} from '@models/utils/coordinates'
import {useObserver} from 'mobx-react-lite'
import React, {useEffect, useRef, useState} from 'react'
import {useGesture} from 'react-use-gesture'
import {createValue, Provider as TransformProvider} from '../utils/useTransform'

export const MAP_SIZE = 5000
const HALF = 0.5
export const MAP_CENTER:[number, number] = [0, 0]

interface StyleProps {
  matrix: DOMMatrixReadOnly,
}

const useStyles = makeStyles({
  root: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
    userDrag: 'none',
    userSelect: 'none',
    overflow: 'hidden',
  },
  center:{
    position: 'absolute',
    margin: 'auto',
    left:0, right:0, top:0, bottom:0,
    width:0, height:0,
  },
  transform: (props: StyleProps) => ({
    position: 'absolute',
    width:0, height:0,
    transform: props.matrix.toString(),
  }),
})

type BaseProps = React.PropsWithChildren<BP>

const options = {
  minScale: 0.2,
  maxScale: 5,
}

let prebThirdPersonView = false
export const Base: React.FC<BaseProps> = (props: BaseProps) => {
  const store = useMapStore()
  const matrix = useObserver(() => store.matrix)
  // changed only when event end, like drag end
  const committedMatrix = useObserver(() => store.committedMatrix)

  const container = useRef<HTMLDivElement>(null)
  const outer = useRef<HTMLDivElement>(null)
  function offset():[number, number] {
    return store.offset
  }
  const participants = useStore()
  const thirdPersonView = useObserver(() => participants.local.get().thirdPersonView)
  const [mouse, setMouse] = useState <[number, number]>([0, 0])  // mouse position relative to outer container
  const [startDrag, setStartDrag] = useState(false)

  const center = transformPoint2D(matrix, participants.local.get().pose.position)
  if (thirdPersonView !== prebThirdPersonView) {
    prebThirdPersonView = thirdPersonView
    if (thirdPersonView) {
      const mapRot = radian2Degree(extractRotation(matrix))
      if (mapRot) {
        const newMatrix = rotateMap(-mapRot, center)
        store.setCommittedMatrix(newMatrix)
      }
    }else {
      const avatarRot = participants.local.get().pose.orientation
      const mapRot = radian2Degree(extractRotation(matrix))
      if (avatarRot + mapRot) {
        const newMatrix = rotateMap(-(avatarRot + mapRot), center)
        store.setCommittedMatrix(newMatrix)
      }
    }
  }

  //  utility
  function rotateMap(degree:number, center:[number, number]) {
    const changeMatrix = (new DOMMatrix()).rotateSelf(0, 0, degree)
    const newMatrix = transfromAt(center, changeMatrix, matrix)
    store.setMatrix(newMatrix)

    return newMatrix
  }

  //  Mouse and touch operations ----------------------------------------------
  const MOUSE_RIGHT = 2
  const bind = useGesture(
    {
      onDragStart: ({event}) => { setStartDrag(true) },
      onDrag: ({down, delta, event, xy, buttons}) => {
        if (startDrag && down && outer.current) {
          if (!thirdPersonView && buttons === MOUSE_RIGHT) {  // right mouse drag - rotate map
            const center = transformPoint2D(matrix, participants.local.get().pose.position)
            const target:[number, number] = addV2(xy, offset())
            const radius1 = subV2(target, center)
            const radius2 = subV2(radius1, delta)

            const cosAngle = crossProduct(radius1, radius2) / (vectorLength(radius1) * vectorLength(radius2))
            const flag = crossProduct(rotate90ClockWise(radius1), delta) > 0 ? -1 : 1
            const angle = Math.acos(cosAngle) * flag
            if (isNaN(angle)) {  // due to accuracy, angle might be NaN when cosAngle is larger than 1
              return  // no need to update matrix
            }

            const newMatrix = rotateMap(radian2Degree(angle), center)
            participants.local.get().pose.orientation = -radian2Degree(extractRotation(newMatrix))
          } else {  // left mouse drag or touch screen drag - translate map
            const diff = rotateVector2D(matrix.inverse(), delta)
            const newMatrix = matrix.translate(...diff)
            store.setMatrix(newMatrix)
          }
        }
      },
      onDragEnd: () => {
        store.setCommittedMatrix(matrix)
        setStartDrag(false)
      },
      onPinch: ({da: [d, a], origin, event, memo}) => {
        if (memo === undefined) {
          return [d, a]
        }

        const [md, ma] = memo

        const center = addV2(origin as [number, number], offset())

        const MIN_D = 10
        let scale = d > MIN_D ? d / md : d <  -MIN_D ? md / d : (1 + (d - md) / MIN_D)
        //  console.log(`Pinch: da:${[d, a]} origin:${origin}  memo:${memo}  scale:${scale}`)

        scale = limitScale(extractScaleX(matrix), scale)

        const changeMatrix = thirdPersonView ?
          (new DOMMatrix()).scaleSelf(scale, scale, 1) :
          (new DOMMatrix()).scaleSelf(scale, scale, 1).rotateSelf(0, 0, a - ma)

        const newMatrix = transfromAt(center, changeMatrix, matrix)
        store.setMatrix(newMatrix)

        if (!thirdPersonView) {
          participants.local.get().pose.orientation = -radian2Degree(extractRotation(newMatrix))
        }

        return [d, a]
      },
      onPinchEnd: () => store.setCommittedMatrix(matrix),
      onWheel: ({movement}) => {
        // tslint:disable-next-line: no-magic-numbers
        let scale = Math.pow(1.2, movement[1] / 1000)
        scale = limitScale(extractScaleX(matrix), scale)
        //  console.log(`Wheel: ${movement}  scale=${scale}`)
        const newMatrix = matrix.scale(scale, scale, 1, ...transformPoint2D(matrix.inverse(), mouse))
        store.setMatrix(newMatrix)
      },
      onWheelEnd: () => store.setCommittedMatrix(matrix),
      onMove: ({xy}) => {
        const mouse = addV2(xy, offset())
        setMouse(mouse)
        const xyOnMap = transformPoint2D(matrix.inverse(), mouse)
        store.setMouseOnMap(xyOnMap)
        //  console.log('xyOnMap:', xyOnMap)
        if (participants.local.get().mousePosition) {
          participants.local.get().mousePosition = Object.assign({}, xyOnMap)
        }
      },
    },
    {
      eventOptions:{passive:false}, //  This prevents default zoom by browser when pinch.
    },
  )
  function onMouseMove(e: React.MouseEvent) {
    console.log(`onMouseMove: oxy:${e.nativeEvent.offsetX},${e.nativeEvent.offsetY}`)
  }

  //  update offset
  useEffect(() => {
    if (outer.current) {
      let cur = outer.current as HTMLElement
      let offsetLeft = 0
      while (cur) {
        offsetLeft += cur.offsetLeft
        cur = cur.offsetParent as HTMLElement
      }
      store.setScreenSize([outer.current.clientWidth, outer.current.clientHeight])
      store.setLeft(offsetLeft)
    }
    // store.setOffset([outer.current.scrollLeft, outer.current.scrollTop])  //  when use scroll
  },        [outer.current, outer.current?.clientWidth, outer.current?.clientHeight])

  //  prevent default behavior of browser on map
  useEffect(
    () => {
      const cb = (e: Event) => { e.preventDefault() }
      //  Not to show context menu with right mouse click
      outer.current?.addEventListener('contextmenu', cb)
      //  Not to zoom by pinch
      outer.current?.addEventListener('touchstart', cb)

      return () => {
        outer.current?.removeEventListener('contextmenu', cb)
        outer.current?.removeEventListener('touchstart', cb)
      }
    },
    [outer])
  // Prevent scroll by wheel
  useEffect(
    () => {
      window.document.body.addEventListener('wheel',
                                            (event) => {
                                              //  console.log('body.wheel called and prevented.')
                                              event.preventDefault()
                                            },
                                            {passive: false})
    },
    [],
  )

  //  Event handlers when use scroll ----------------------------------------------
  //  Move to center when root div is created.
  /*
  useEffect(
    () => {
      if (outer.current) {
        const elem = outer.current
        console.log('useEffect[outer] called')
        elem.scrollTo((MAP_SIZE - elem.clientWidth) * HALF, (MAP_SIZE - elem.clientHeight) *  HALF)
      }
    },
    [outer],
  )
  if (!showScrollbar) {
    const elem = outer.current
    if (elem) {
      elem.scrollTo((MAP_SIZE - elem.clientWidth) * HALF, (MAP_SIZE - elem.clientHeight) *  HALF)
    }
  }
  */
  // scroll range
  /*  useEffect(
    () => {
      const orgMat = new DOMMatrix(matrix.toString())
      setMatrix(orgMat)
    },
    [outer],
  )
  */

  const styleProps: StyleProps = {
    matrix,
  }
  const classes = useStyles(styleProps)
  const transfromValue = createValue(store.committedMatrix, [0, 0])

  return (
    <div className={[classes.root, props.className].join(' ')} ref={outer} {...bind()} >
      <div className={classes.center}>
        <TransformProvider value={transfromValue}>
          <div id="map-transform" className={classes.transform} ref={container}>
              {props.children}
          </div>
        </TransformProvider>
      </div>
    </div>
  )
}
Base.displayName = 'MapBase'


//  utility
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
