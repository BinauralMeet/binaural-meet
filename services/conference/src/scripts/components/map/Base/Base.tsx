import {makeStyles} from '@material-ui/core'
import {multiply, rotateVector2D, transformPoint2D} from '@models/utils'
import React, {useEffect, useRef, useState} from 'react'
import {subV, useGesture} from 'react-use-gesture'

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
  mouse: (props: StyleProps) => ({
    position: 'absolute',
    left: props.mouse[0],
    top: props.mouse[1],
    width: 20,
    height: 20,
    backgroundColor: 'red',
    pointerEvents: 'none',
  }),
})

interface BaseProps {
  children?: React.ReactElement | React.ReactElement[]
}

export const Base: React.FC<BaseProps> = (props: BaseProps) => {
  const container = useRef<HTMLDivElement>(null)

  const [mouse, setMouse] = useState<[number, number]>([0, 0])
  const [matrix, setMatrix] = useState<DOMMatrixReadOnly>(new DOMMatrixReadOnly())

  const bind = useGesture(
    {
      onDrag: ({down, delta, event}) => {
        if (down) {
          event?.preventDefault()
          const diff = rotateVector2D(matrix.inverse(), delta)
          const newMatrix = matrix.translate(...diff)
          setMatrix(newMatrix)
        }
      },
      onPinch: ({da: [d, a], origin, event, memo}) => {
        event?.preventDefault()

        if (memo === undefined) {
          return [d, a]
        }

        const [md, ma] = memo

        console.log(d, a)

        const div = container.current as HTMLDivElement
        const center = subV(origin as [number, number], [div.offsetLeft, div.offsetTop] as [number, number])

        console.log(center)

        const scale = d / md

        const changeMatrix = (new DOMMatrix()).scaleSelf(scale, scale, 1).rotateSelf(0, 0, a - ma)

        const tm = (new DOMMatrix()).translate(
          ...subV([0, 0] as [number, number], center))
        const itm = (new DOMMatrix()).translateSelf(...center)

        const newMatrix = multiply([itm, changeMatrix, tm, matrix])
        setMatrix(newMatrix)

        return [d, a]
      },
      onWheel: ({movement}) => {
        const scale = Math.pow(1.2, movement[1] / 1000)
        const newMatrix = matrix.scale(scale, scale, 1, ...transformPoint2D(matrix.inverse(), mouse))
        setMatrix(newMatrix)
      },
      onMove: ({xy}) => {
        const div = container.current as HTMLDivElement
        setMouse(subV(xy, [div.offsetLeft, div.offsetTop] as [number, number]))
      },
    },
    {
      domTarget: window,
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

  return (
    <div className={classes.root} ref={container}>
      <div id="map-transform" className={classes.transform}>
        {props.children}
      </div>
    </div>
  )
}
