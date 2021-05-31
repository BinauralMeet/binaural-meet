import {BaseProps as BP} from '@components/utils'
import {useStore as useMapStore} from '@hooks/MapStore'
import {useStore} from '@hooks/ParticipantsStore'
import {makeStyles} from '@material-ui/core/styles'
import {PARTICIPANT_SIZE} from '@models/Participant'
import {
  crossProduct, extractRotation, extractScaleX,
  radian2Degree, rotate90ClockWise, rotateVector2D, transformPoint2D, transfromAt, vectorLength,
} from '@models/utils'
import {addV2, mulV2, normV, subV2} from '@models/utils/coordinates'
import {useObserver} from 'mobx-react-lite'
import React, {useEffect, useRef} from 'react'
import ResizeObserver from 'react-resize-observer'
import {useGesture} from 'react-use-gesture'

export const MAP_SIZE = 5000
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
  const container = useRef<HTMLDivElement>(null)
  const outer = useRef<HTMLDivElement>(null)
  function offset():[number, number] {
    return mapStore.offset
  }
  const participants = useStore()
  const thirdPersonView = useObserver(() => participants.local.thirdPersonView)
  const memRef = useRef<BaseMember>(new BaseMember())
  const mem = memRef.current

  const center = transformPoint2D(matrix, participants.local.pose.position)
  if (thirdPersonView !== mem.prebThirdPersonView) {
    mem.prebThirdPersonView = thirdPersonView
    if (thirdPersonView) {
      const mapRot = radian2Degree(extractRotation(matrix))
      if (mapRot) {
        const newMatrix = rotateMap(-mapRot, center)
        mapStore.setCommittedMatrix(newMatrix)
      }
    }else {
      const avatarRot = participants.local.pose.orientation
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
        document.body.focus()
        mem.dragging = true
        mem.mouseDown = true
        //  console.log('Base StartDrag:')
        if (buttons === MOUSE_LEFT) {
          //  move participant to mouse position
          setTimeout(() => {
            function moveParticipant(move: boolean) {
              if (mem.mouseDown) {
                const local = participants.local
                const diff = subV2(mapStore.mouseOnMap, local.pose.position)
                if (normV(diff) > PARTICIPANT_SIZE / 2) {
                  const dir = mulV2(10 / normV(diff), diff)
                  local.pose.orientation = Math.atan2(dir[0], -dir[1]) * 180 / Math.PI
                  if (move) {
                    local.pose.position = addV2(local.pose.position, dir)
                  }
                  local.savePhysicsToStorage(false)
                }
                const TIMER_INTERVAL = move ? 33 : 300
                setTimeout(() => { moveParticipant(true) }, TIMER_INTERVAL)
              }
            }
            moveParticipant(false)
          },         300)
        }
      },
      onDrag: ({down, delta, xy, buttons}) => {
        if (delta[0] || delta[1]) { mem.mouseDown = false }
        //  if (mapStore.keyInputUsers.size) { return }
        if (mem.dragging && down && outer.current) {
          if (!thirdPersonView && buttons === MOUSE_RIGHT) {  // right mouse drag - rotate map
            const center = transformPoint2D(matrix, participants.local.pose.position)
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
            participants.local.pose.orientation = -radian2Degree(extractRotation(newMatrix))
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
        if (mem.mouseDown){
          props.contents.setEditing('')
        }
        mapStore.setCommittedMatrix(matrix)
        mem.dragging = false
        mem.mouseDown = false
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
        //console.log(`Pinch: da:${[d, a]} origin:${origin}  memo:${memo}  scale:${scale}`)

        scale = limitScale(extractScaleX(matrix), scale)

        const changeMatrix = thirdPersonView ?
          (new DOMMatrix()).scaleSelf(scale, scale, 1) :
          (new DOMMatrix()).scaleSelf(scale, scale, 1).rotateSelf(0, 0, a - ma)

        const newMatrix = transfromAt(center, changeMatrix, matrix)
        mapStore.setMatrix(newMatrix)

        if (!thirdPersonView) {
          participants.local.pose.orientation = -radian2Degree(extractRotation(newMatrix))
        }

        return [d, a]
      },
      onPinchEnd: () => mapStore.setCommittedMatrix(matrix),
      onWheel: ({movement, ctrlKey, event}) => {
        //  event?.preventDefault()

        if (false) {  // false:alwas zoom (or ctrlKey: scroll and zoom)
          // scroll wheel - translate map
          const diff = mulV2(0.2, rotateVector2D(matrix.inverse(), movement))
          const newMatrix = matrix.translate(-diff[0], -diff[1])
          mapStore.setMatrix(newMatrix)
        }else {
          //  CTRL+weel - zoom map
          let scale = Math.pow(1.2, movement[1] / 1000)
          scale = limitScale(extractScaleX(matrix), scale)
          if (scale === 1){ return }

          //  console.log(`Wheel: ${movement}  scale=${scale}`)
          const newMatrix = matrix.scale(scale, scale, 1, ...transformPoint2D(matrix.inverse(), mapStore.mouse))
          mapStore.setMatrix(newMatrix)
        }
      },
      onWheelEnd: () => mapStore.setCommittedMatrix(matrix),
      onMove:({xy}) => {
        mapStore.setMouse(xy)
        participants.local.mouse.position = Object.assign({}, mapStore.mouseOnMap)
      },
      onTouchStart:(ev) => {
        mapStore.setMouse([ev.touches[0].clientX, ev.touches[0].clientY])
        participants.local.mouse.position = Object.assign({}, mapStore.mouseOnMap)
      },
    },
    {
      eventOptions:{passive:false}, //  This prevents default zoom by browser when pinch.
    },
  )

  //  setClientRect of the outer.
  useEffect(
    () => {
      onResizeOuter()
    },
    // eslint-disable-next-line  react-hooks/exhaustive-deps
    [],
  )

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

      return () => window.document.body.removeEventListener('wheel', handler)
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
  const onResizeOuter = useRef(
      () => {
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
  ).current

  const styleProps: StyleProps = {
    matrix,
  }
  const classes = useStyles(styleProps)

  return (
    <div className={classes.root} ref={outer} {...bind()} >
      <ResizeObserver onResize = { onResizeOuter } />
      <div className={classes.center}>
        <div id="map-transform" className={classes.transform} ref={container}>
            {props.children}
        </div>
      </div>
    </div>
  )
}
Base.displayName = 'MapBase'

