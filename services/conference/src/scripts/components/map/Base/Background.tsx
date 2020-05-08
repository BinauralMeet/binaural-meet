import {makeStyles} from '@material-ui/core'
import {rotateVector2D, transformPoint2D} from '@models/utils'
import React, {useEffect, useRef, useState} from 'react'
import {addV, subV, useGesture} from 'react-use-gesture'

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
  background: {
    position: 'absolute',
    backgroundColor: '#DFDBE5',
    backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.4'%3E%3Cpath d='M50 50c0-5.523 4.477-10 10-10s10 4.477 10 10-4.477 10-10 10c0 5.523-4.477 10-10 10s-10-4.477-10-10 4.477-10 10-10zM10 10c0-5.523 4.477-10 10-10s10 4.477 10 10-4.477 10-10 10c0 5.523-4.477 10-10 10S0 25.523 0 20s4.477-10 10-10zm10 8c4.418 0 8-3.582 8-8s-3.582-8-8-8-8 3.582-8 8 3.582 8 8 8zm40 40c4.418 0 8-3.582 8-8s-3.582-8-8-8-8 3.582-8 8 3.582 8 8 8z' /%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
    height: 400,
    width: 400,
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

export const Background: React.FC<{}> = () => {
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
      onPinch: ({da: [d, a], event}) => {
        event?.preventDefault()
        console.log(d, a)
      },
      onWheel: ({movement}) => {
        const rawScale = movement[1] / 90
        const scale = rawScale > 0 ? rawScale : rawScale < 0 ? -1 / rawScale : 1
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
        <div className={classes.background} />
        <div id="mouse-indicator" className={classes.mouse} />
      </div>
    </div>
  )
}
