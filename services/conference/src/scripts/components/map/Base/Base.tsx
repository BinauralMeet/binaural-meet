import {BaseProps as BP} from '@components/utils'
import {useStore} from '@hooks/ParticipantsStore'
import {makeStyles} from '@material-ui/core/styles'
import {
  crossProduct, extractRotation, extractScaleX, multiply,
  radian2Degree, rotate90ClockWise, rotateVector2D, transformPoint2D, vectorLength,
} from '@models/utils'
import {useObserver} from 'mobx-react-lite'
import React, {useRef, useEffect, useState} from 'react'
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
    left: '50%',
    top: '50%',
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
  const outer = useRef<HTMLDivElement>(null)
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
          if (buttons === 2) {  // right mouse drag - rotate map
            const center = transformPoint2D(matrix, localParticipantPosition)
            const target = subV(xy, getDivAnchor(container))
            const radius1 = subV(target, center)
            const radius2 = subV(radius1, delta)

            const cosAngle = crossProduct(radius1, radius2) / (vectorLength(radius1) * vectorLength(radius2))
            const flag = crossProduct(rotate90ClockWise(radius1), delta) > 0 ? -1 : 1
            const angle = Math.acos(cosAngle) * flag
            if (isNaN(angle)) {  // due to accuracy, angle might be NaN when cosAngle is larger than 1
              return  // no need to update matrix
            }

            const changeMatrix = (new DOMMatrix()).rotateSelf(0, 0, radian2Degree(angle))

            const tm = (new DOMMatrix()).translate(
              ...subV([0, 0] as [number, number], center))
            const itm = (new DOMMatrix()).translateSelf(...center)

            const newMatrix = multiply([itm, changeMatrix, tm, matrix])
            setMatrix(newMatrix)

            participants.local.get().pose.orientation = -radian2Degree(extractRotation(newMatrix))
          } else {  // left mouse drag or touch screen drag - translate map
            const diff = rotateVector2D(matrix.inverse(), delta)
            const newMatrix = matrix.translate(...diff)
            setMatrix(newMatrix)
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

        const center = subV(origin as [number, number], getDivAnchor(container))

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
        setMouse(subV(xy, getDivAnchor(container)))
      },
    },
    {
      eventOptions: {
        passive: false,
      }
    },
  )
  useEffect(
    () => {
      bind()
      window.document.body.addEventListener(
        'paste',
        (event) => {
          onPaste(event)
          event.preventDefault()
        }
      )
    },
    [bind],
  )

  const relativeMouse = matrix.inverse().transformPoint(new DOMPoint(...mouse))
  const styleProps: StyleProps = {
    matrix,
    mouse: [relativeMouse.x, relativeMouse.y],
  }
  const classes = useStyles(styleProps)

  const transfromValue = createValue(commitedMatrix, getDivAnchor(container))

  function onPaste(evt: ClipboardEvent){
    console.log("onPaste called")
    console.dir(evt)
    console.dir(evt.clipboardData)
    if (evt.clipboardData){
      console.dir(evt.clipboardData.items);
      console.log("text:" + evt.clipboardData.getData("text"))
      console.log("url:" + evt.clipboardData.getData("url"))
      const imageFile = evt.clipboardData.items[0].getAsFile()
      console.dir(imageFile);
      if (imageFile){
        const formData = new FormData();
        formData.append('access_token', 'e9889a51fca19f2712ec046016b7ec0808953103e32cd327b91f11bfddaa8533')
        formData.append('imagedata', imageFile)
        fetch('https://upload.gyazo.com/api/upload', {method: 'POST', body: formData})
        .then((response) => response.json())
        .then((responseJson) => {
          console.log("URL = " + responseJson.url)
          //  To do, add URL and ask user position to place the image
        })
        .catch((error) =>{
          console.error(error);
        });
      }
    }
  }

  return (
    <div className={[classes.root, props.className].join(' ')} ref={outer}>
      <TransformProvider value={transfromValue}>
        <div id="map-transform" className={classes.transform} ref={container}>
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

function getDivAnchor(e: React.RefObject<HTMLDivElement>): [number, number] {
  const div = e.current;
  if (div === null){
    return [0, 0]
  }
  return [div.offsetLeft, div.offsetTop]
}
