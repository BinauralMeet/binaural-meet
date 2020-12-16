import {BaseProps as BP} from '@components/utils'
import {useStore as useMapStore} from '@hooks/MapStore'
import {useStore} from '@hooks/ParticipantsStore'
import {makeStyles} from '@material-ui/core/styles'
import {PARTICIPANT_SIZE} from '@models/Participant'
import {
  crossProduct, extractRotation, extractScaleX,
  radian2Degree, rotate90ClockWise, rotateVector2D, transformPoint2D, transfromAt, vectorLength,
} from '@models/utils'
import {addV2, extractScale, mulV2, normV, subV2} from '@models/utils/coordinates'
import {MapData} from '@stores/MapObject/MapData'
import {useObserver} from 'mobx-react-lite'
import React, {useEffect, useRef, useState} from 'react'
import ResizeObserver from 'react-resize-observer'
import {useGesture} from 'react-use-gesture'
import {createValue, Provider as TransformProvider} from '../utils/useTransform'

export const MAP_SIZE = 5000
const HALF = 0.5
export const MAP_CENTER:[number, number] = [0, 0]


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

class BaseMember{
  prebThirdPersonView = false
  mouseDown = false
  dragging = false
}

export const Base: React.FC<BaseProps> = (props: BaseProps) => {
  const mapStore = useMapStore()
  const matrix = useObserver(() => mapStore.matrix)
  // changed only when event end, like drag end
  const committedMatrix = useObserver(() => mapStore.committedMatrix)

  const container = useRef<HTMLDivElement>(null)
  const outer = useRef<HTMLDivElement>(null)
  function offset():[number, number] {
    return mapStore.offset
  }
  const participants = useStore()
  const thirdPersonView = useObserver(() => participants.local.get().thirdPersonView)
  const mem = useRef<BaseMember>(new BaseMember)

  const center = transformPoint2D(matrix, participants.local.get().pose.position)
  if (thirdPersonView !== mem.current.prebThirdPersonView) {
    mem.current.prebThirdPersonView = thirdPersonView
    if (thirdPersonView) {
      const mapRot = radian2Degree(extractRotation(matrix))
      if (mapRot) {
        const newMatrix = rotateMap(-mapRot, center)
        mapStore.setCommittedMatrix(newMatrix)
      }
    }else {
      const avatarRot = participants.local.get().pose.orientation
      const mapRot = radian2Degree(extractRotation(matrix))
      if (avatarRot + mapRot) {
        const newMatrix = rotateMap(-(avatarRot + mapRot), center)
        mapStore.setCommittedMatrix(newMatrix)
      }
    }
  }

  //  utility
  function rotateMap(degree:number, center:[number, number]) {
    const changeMatrix = (new DOMMatrix()).rotateSelf(0, 0, degree)
    const newMatrix = transfromAt(center, changeMatrix, matrix)
    mapStore.setMatrix(newMatrix)

    return newMatrix
  }

  //  Mouse and touch operations ----------------------------------------------
  const MOUSE_LEFT = 1
  const MOUSE_RIGHT = 2
  const bind = useGesture(
    {
      onDragStart: ({buttons}) => {
        if (mapStore.keyInputUsers.size) { return }
        mem.current.dragging = true
        mem.current.mouseDown = true
        //  console.log('Base StartDrag:')
        if (buttons === MOUSE_LEFT) { //  move participant to mouse position
          setTimeout(() => {
            function moveParticipant() {
              if (mem.current.mouseDown) {
                const local = participants.local.get()
                const diff = subV2(mapStore.mouseOnMap, local.pose.position)
                if (normV(diff) > PARTICIPANT_SIZE / 2) {
                  const dir = mulV2(10 / normV(diff), diff)
                  local.pose.position = addV2(local.pose.position, dir)
                  local.pose.orientation = Math.atan2(dir[0], -dir[1]) * 180 / Math.PI

                  local.savePhysicsToStorage(false)
                }
                const TIMER_INTERVAL = 33
                setTimeout(moveParticipant, TIMER_INTERVAL)
              }
            }
            moveParticipant()
          },         300)
        }
      },
      onDrag: ({down, delta, xy, buttons}) => {
        if (mapStore.keyInputUsers.size) { return }
        if (delta[0] || delta[1]) { mem.current.mouseDown = false }
        if (mem.current.dragging && down && outer.current) {
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
          } else {
            // left mouse drag or touch screen drag - translate map
            const diff = rotateVector2D(matrix.inverse(), delta)
            const newMatrix = matrix.translate(...diff)
            mapStore.setMatrix(newMatrix)
            //  console.log('Base onDrag:', delta)
          }
        }
      },
      onDragEnd: () => {
        mapStore.setCommittedMatrix(matrix)
        mem.current.dragging = false
        mem.current.mouseDown = false
        //  console.log('Base onDragEnd:')
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
        mapStore.setMatrix(newMatrix)

        if (!thirdPersonView) {
          participants.local.get().pose.orientation = -radian2Degree(extractRotation(newMatrix))
        }

        return [d, a]
      },
      onPinchEnd: () => mapStore.setCommittedMatrix(matrix),
      onWheel: ({movement, ctrlKey, event}) => {
        //  event?.preventDefault()

        if (mapStore.keyInputUsers.size) { return }
        if (false) {  // false:alwas zoom (or ctrlKey: scroll and zoom)
          // scroll wheel - translate map
          const diff = mulV2(0.2, rotateVector2D(matrix.inverse(), movement))
          const newMatrix = matrix.translate(-diff[0], -diff[1])
          mapStore.setMatrix(newMatrix)
        }else {
          //  CTRL+weel - zoom map
          let scale = Math.pow(1.2, movement[1] / 1000)
          scale = limitScale(extractScaleX(matrix), scale)
          //  console.log(`Wheel: ${movement}  scale=${scale}`)
          const newMatrix = matrix.scale(scale, scale, 1, ...transformPoint2D(matrix.inverse(), mapStore.mouse))
          mapStore.setMatrix(newMatrix)
        }
      },
      onWheelEnd: () => mapStore.setCommittedMatrix(matrix),
      onMove: ({xy}) => {
        mapStore.setMouse(xy)
        //  console.log('xyOnMap:', xyOnMap)
        participants.local.get().mouse.position = Object.assign({}, mapStore.mouseOnMap)
      },
    },
    {
      eventOptions:{passive:false}, //  This prevents default zoom by browser when pinch.
    },
  )

  //  prevent default behavior of browser on map, setClientRect of the outer.
  useEffect(
    () => {
      onResizeOuter()
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

  // Prevent browser's zoom
  useEffect(
    () => {
      function handler(event:WheelEvent) {
        if (event.ctrlKey) {
          event.preventDefault()
          //  console.log('CTRL + mouse wheel = zoom prevented.', event)
        }
      }
      window.document.body.addEventListener('wheel', handler, {passive: false})

      return () => removeEventListener('wheel', handler)
    },
    [],
  )
  /*  //  This has no effect for iframe and other cases can be handled by onMove. So this is useless
  //  preview mouse move on outer
  useEffect(
    () => {
      function handler(ev:MouseEvent) {
        mapStore.setMouse([ev.clientX, ev.clientY])
      }
      if (outer.current) {
        outer.current.addEventListener('mousemove', handler, {capture:true})
      }

      return () => {
        if (outer.current) {
          outer.current.removeEventListener('mousemove', handler)
        }
      }
    },
    [outer])
  */
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
  //  update offset
  function onResizeOuter() {
    if (outer.current) {
      let cur = outer.current as HTMLElement
      let offsetLeft = 0
      while (cur) {
        offsetLeft += cur.offsetLeft
        cur = cur.offsetParent as HTMLElement
      }
      //  console.log(`sc:[${outer.current.clientWidth}, ${outer.current.clientHeight}] left:${offsetLeft}`)
      mapStore.setScreenSize([outer.current.clientWidth, outer.current.clientHeight])
      mapStore.setLeft(offsetLeft)
      // mapStore.setOffset([outer.current.scrollLeft, outer.current.scrollTop])  //  when use scroll
    }
  }

  const styleProps: StyleProps = {
    matrix,
  }
  const classes = useStyles(styleProps)
  const transfromValue = createValue(mapStore.committedMatrix, [0, 0])

  return (
    <div className={[classes.root, props.className].join(' ')} ref={outer} {...bind()}>
      <ResizeObserver onResize = { onResizeOuter } />
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

