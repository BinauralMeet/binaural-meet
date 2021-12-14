import {MapProps as BP} from '@components/utils'
import {makeStyles} from '@material-ui/core/styles'
import {PARTICIPANT_SIZE} from '@models/Participant'
import {
  crossProduct, extractRotation, extractScaleX,
  radian2Degree, rotate90ClockWise, rotateVector2D, transformPoint2D, transfromAt, vectorLength,
} from '@models/utils'
import {addV2, mulV2, normV, subV2} from '@models/utils/coordinates'
import {SCALE_LIMIT} from '@stores/Map'
import {useObserver} from 'mobx-react-lite'
import React, {useEffect, useRef} from 'react'
import ResizeObserver from 'react-resize-observer'
import {useGesture} from 'react-use-gesture'

//  utility
function limitScale(currentScale: number, scale: number): number {
  const targetScale = currentScale * scale

  if (targetScale > SCALE_LIMIT.maxScale) {
    return SCALE_LIMIT.maxScale / currentScale
  }

  if (targetScale < SCALE_LIMIT.minScale) {
    return SCALE_LIMIT.minScale / currentScale
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

type MapProps = React.PropsWithChildren<BP>

class BaseMember{
  prebThirdPersonView = false
  mouseDown = false
  dragging = false
}

export const Base: React.FC<MapProps> = (props: MapProps) => {
  const {map, participants} = props.stores
  const matrix = useObserver(() => map.matrix)
  const container = useRef<HTMLDivElement>(null)
  const outer = useRef<HTMLDivElement>(null)
  function offset():[number, number] {
    return map.offset
  }
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
        map.setCommittedMatrix(newMatrix)
      }
    }else {
      const avatarRot = participants.local.pose.orientation
      const mapRot = radian2Degree(extractRotation(matrix))
      if (avatarRot + mapRot) {
        const newMatrix = rotateMap(-(avatarRot + mapRot), center)
        map.setCommittedMatrix(newMatrix)
      }
    }
  }

  //  utility
  function rotateMap(degree:number, center:[number, number]) {
    const changeMatrix = (new DOMMatrix()).rotateSelf(0, 0, degree)
    const newMatrix = transfromAt(center, changeMatrix, matrix)
    map.setMatrix(newMatrix)

    return newMatrix
  }

  //  Mouse and touch operations ----------------------------------------------
  const MOUSE_LEFT = 1
  const MOUSE_RIGHT = 2

  //  zoom by scrollwheel
  function wheelHandler(event:React.WheelEvent) {
    if (!event.ctrlKey) {
      /*  //  translate map
      const diff = mulV2(0.2, rotateVector2D(matrix.inverse(), [event.deltaX, event.deltaY]))
      const newMatrix = matrix.translate(-diff[0], -diff[1])
      map.setMatrix(newMatrix)*/

      //  zoom map
      let scale = Math.pow(1.2, event.deltaY / 100)
      scale = limitScale(extractScaleX(map.matrix), scale)
      //  console.log(`zoom scale:${scale}`)
      if (scale === 1){
        return
      }

      //  console.log(`Wheel: ${movement}  scale=${scale}`)
      const newMatrix = map.matrix.scale(scale, scale, 1,
        ...transformPoint2D(map.matrix.inverse(), map.mouse))
      map.setMatrix(newMatrix)
      map.setCommittedMatrix(newMatrix)
    }
  }
  function moveParticipant(move: boolean, givenTarget?:[number,number]) {
    const local = participants.local
    let target = givenTarget
    if (!target){ target = map.mouseOnMap }
    const diff = subV2(target, local.pose.position)
    if (normV(diff) > (givenTarget ? PARTICIPANT_SIZE*2 : PARTICIPANT_SIZE / 2)) {
      const dir = mulV2(20 / normV(diff), diff)
      local.pose.orientation = Math.atan2(dir[0], -dir[1]) * 180 / Math.PI
      if (move) {
        local.pose.position = addV2(local.pose.position, dir)
      }
      local.savePhysicsToStorage(false)
    }
  }
  function moveParticipantPeriodically(move: boolean, target?:[number,number]) {
    moveParticipant(move, target)
    const TIMER_INTERVAL = move ? 33 : 300
    setTimeout(() => {
      if (mem.mouseDown) {
        moveParticipantPeriodically(true)
      }
    }, TIMER_INTERVAL) //  move to mouse position
  }

  const bind = useGesture(
    {
      onDragStart: ({buttons}) => {
        document.body.focus()
        mem.dragging = true
        mem.mouseDown = true
        //  console.log('Base StartDrag:')
        if (buttons === MOUSE_LEFT) {
          //  move participant to mouse position
          moveParticipantPeriodically(false)  //  inital rotation.
        }
      },
      onDrag: ({down, delta, xy, buttons}) => {
        if (delta[0] || delta[1]) { mem.mouseDown = false }
        //  if (map.keyInputUsers.size) { return }
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
            map.setMatrix(newMatrix)
            //  rotate and direct participant to the mouse position.
            if (delta[0] || delta[1]){
              moveParticipant(false, map.centerOnMap)
            }
            //console.log('Base onDrag:', delta)
          }
        }
      },
      onDragEnd: () => {
        if (matrix.toString() !== map.committedMatrix.toString()) {
          map.setCommittedMatrix(matrix)
          moveParticipant(false, map.centerOnMap)
          //console.log(`Base onDragEnd: (${map.centerOnMap})`)
        }
        mem.dragging = false
        mem.mouseDown = false
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
        map.setMatrix(newMatrix)

        if (!thirdPersonView) {
          participants.local.pose.orientation = -radian2Degree(extractRotation(newMatrix))
        }

        return [d, a]
      },
      onPinchEnd: () => map.setCommittedMatrix(matrix),
      onMove:({xy}) => {
        map.setMouse(xy)
        participants.local.mouse.position = Object.assign({}, map.mouseOnMap)
      },
      onTouchStart:(ev) => {
        map.setMouse([ev.touches[0].clientX, ev.touches[0].clientY])
        participants.local.mouse.position = Object.assign({}, map.mouseOnMap)
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
      function topWindowHandler(event:WheelEvent) {
        //console.log(event)
        if (event.ctrlKey) {
          if (window.visualViewport && window.visualViewport.scale > 1){
            if (event.deltaY < 0){
              event.preventDefault()
              //  console.log('prevent', event.deltaY)
            }else{
              //  console.log('through', event.deltaY)
            }
          }else{
            event.preventDefault()
          }
          //  console.log('CTRL + mouse wheel = zoom prevented.', event)
        }
      }


      window.document.body.addEventListener('wheel', topWindowHandler, {passive: false})

      return () => {
        window.document.body.removeEventListener('wheel', topWindowHandler)
      }
    },
    [],
  )
  /*  //  This has no effect for iframe and other cases can be handled by onMove. So this is useless
  //  preview mouse move on outer
  useEffect(
    () => {
      function handler(ev:MouseEvent) {
        map.setMouse([ev.clientX, ev.clientY])
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
        map.setScreenSize([outer.current.clientWidth, outer.current.clientHeight])
        map.setLeft(offsetLeft)
        // map.setOffset([outer.current.scrollLeft, outer.current.scrollTop])  //  when use scroll
      }
    }
  ).current

  const styleProps: StyleProps = {
    matrix,
  }
  const classes = useStyles(styleProps)

  return (
    <div className={classes.root} ref={outer} {...bind()}>
      <ResizeObserver onResize = { onResizeOuter } />
      <div className={classes.center} onWheel={wheelHandler}>
        <div id="map-transform" className={classes.transform} ref={container}>
            {props.children}
        </div>
      </div>
    </div>
  )
}
Base.displayName = 'MapBase'

