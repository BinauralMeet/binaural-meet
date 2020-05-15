import {makeStyles} from '@material-ui/core/styles'
import {extractRotation, transformPoint2D} from '@models/utils'
import {createContext, useContext, useMemo} from 'react'
import {addV, subV} from 'react-use-gesture'

interface StyleProps {
  matrix: DOMMatrix | DOMMatrixReadOnly
}

const useStyles = makeStyles({
  antiRotation: (props: StyleProps) => ({
    transform: `rotate(${-extractRotation(props.matrix)}rad)`,
  }),
})

interface ContextValue {
  antiRotationClass: string
  local2Global: (local: [number, number]) => [number, number]
  global2Local: (global: [number, number]) => [number, number]
}

const Context = createContext<ContextValue>({
  antiRotationClass: 'default_class_name',
  local2Global: local => local,
  global2Local: global => global,
})

export const createValue = (matrix: DOMMatrix | DOMMatrixReadOnly, clientPosition: [number, number]) => {
  const antiRotationClass = useStyles({matrix}).antiRotation
  const res = useMemo(
    () => ({
      antiRotationClass,
      local2Global: (position: [number, number]) => addV(clientPosition, transformPoint2D(matrix, position)),
      global2Local: (position: [number, number]) => transformPoint2D(matrix.inverse(), subV(position, clientPosition)),
    }),
    [matrix],
  )

  return res
}
export const Provider = Context.Provider
export const useValue = () => useContext(Context)
