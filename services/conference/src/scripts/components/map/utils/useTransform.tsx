import {makeStyles} from '@material-ui/core/styles'
import {extractRotation, rotateVector2D, transformPoint2D} from '@models/utils'
import {createContext, useContext, useMemo} from 'react'
import {addV, subV} from 'react-use-gesture'

interface StyleProps {
  matrix: DOMMatrix | DOMMatrixReadOnly
}

const useStyles = makeStyles({
  counterRotation: (props: StyleProps) => ({
    transform: `rotate(${-extractRotation(props.matrix)}rad)`,
  }),
})

interface ContextValue {
  counterRotationClass: string
  local2Global: (local: [number, number]) => [number, number]
  global2Local: (global: [number, number]) => [number, number]
  rotateL2G: (vector: [number, number]) => [number, number],
  rotateG2L: (vector: [number, number]) => [number, number],
  rotation: number,
}

const Context = createContext<ContextValue>({
  counterRotationClass: 'default_class_name',
  local2Global: local => local,
  global2Local: global => global,
  rotateL2G: local => local,
  rotateG2L: global => global,
  rotation: 0,
})

export const createValue = (matrix: DOMMatrix | DOMMatrixReadOnly, clientPosition: [number, number]) => {
  const counterRotationClass = useStyles({matrix}).counterRotation
  const rotation = extractRotation(matrix) * 180 / Math.PI
  const res = useMemo(
    () => ({
      counterRotationClass,
      local2Global: (position: [number, number]) => addV(clientPosition, transformPoint2D(matrix, position)),
      global2Local: (position: [number, number]) => transformPoint2D(matrix.inverse(), subV(position, clientPosition)),
      rotateL2G: (vector: [number, number]) => rotateVector2D(matrix, vector),
      rotateG2L: (vector: [number, number]) => rotateVector2D(matrix.inverse(), vector),
      rotation,
    }),
    [matrix],
  )

  return res
}
export const Provider = Context.Provider
export const useValue = () => useContext(Context)
