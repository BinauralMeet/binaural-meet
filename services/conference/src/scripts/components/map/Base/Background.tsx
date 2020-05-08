import {makeStyles} from '@material-ui/core'
import {multiplyMatrixAndPoint2D} from '@models/utils'
import React, {useRef, useState} from 'react'
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

function useMatrix() {
  const [matrix, setMatrix] = useState<DOMMatrixReadOnly>(new DOMMatrixReadOnly())
  const [baseMatrix, setBaseMatrix] = useState<DOMMatrixReadOnly>(new DOMMatrixReadOnly())

  function onChangeOnBase(applyChange: (baseMatrix: DOMMatrixReadOnly) => DOMMatrixReadOnly) {
    setMatrix(applyChange(baseMatrix))
  }

  function onChangeOnCurrent(applyChange: (baseMatrix: DOMMatrixReadOnly) => DOMMatrixReadOnly) {
    setMatrix(applyChange(matrix))
  }

  function onEnd() {
    setBaseMatrix(DOMMatrixReadOnly.fromMatrix(matrix))
    console.log('on end')
  }

  return {matrix, onEnd, onChangeOnBase, onChangeOnCurrent}
}

export const Background: React.FC<{}> = () => {
  const container = useRef<HTMLDivElement>(null)
  const {matrix, onEnd, onChangeOnBase, onChangeOnCurrent} = useMatrix()

  const [mouse, setMouse] = useState<[number, number]>([0, 0])
  const [translate, setTranslate] = useState<[number, number]>([0, 0])

  const bind = useGesture({
    onDragEnd: onEnd,
    onDrag: ({down, offset, delta}) => {
      if (down) {
        onChangeOnBase((matrix) => {
          const diff = multiplyMatrixAndPoint2D(matrix.inverse(), delta)
          const newTranslate = addV(translate, diff)
          console.log(diff, newTranslate)
          setTranslate(newTranslate)

          return matrix.translate(...newTranslate)
        })
      }
    },
    onPinchEnd: onEnd,
    onPinch: ({da: [d, a]}) => {
      console.log(d, a)
    },
    onWheelEnd: onEnd,
    onWheel: ({movement}) => {
      onChangeOnCurrent((matrix) => {
        const rawScale = movement[1] / 90
        const scale = rawScale > 0 ? rawScale : rawScale < 0 ? -1 / rawScale : 1

        return matrix.scale(scale, scale, 1, ...multiplyMatrixAndPoint2D(matrix.inverse(), mouse))
      })
    },
    onMove: ({xy}) => {
      const div = container.current as HTMLDivElement
      setMouse(subV(xy, [div.offsetLeft, div.offsetTop] as [number, number]))
    }
  })

  const relativeMouse = matrix.inverse().transformPoint(new DOMPoint(...mouse))
  const styleProps: StyleProps = {
    matrix,
    mouse: [relativeMouse.x, relativeMouse.y],
  }
  const classes = useStyles(styleProps)

  return (
    <div className={classes.root} ref={container}>
      <div id="map-transform" className={classes.transform} {...bind()}>
        <div className={classes.background} />
        <div id="mouse-indicator" className={classes.mouse} />
      </div>
    </div>
  )
}
