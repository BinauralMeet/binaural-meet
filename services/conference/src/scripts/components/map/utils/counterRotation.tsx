import {makeStyles} from '@material-ui/core/styles'
import {extractRotation} from '@models/utils'
import {createContext, useContext} from 'react'

interface StyleProps {
  matrix: DOMMatrix | DOMMatrixReadOnly
}

export const useStyles = makeStyles({
  antiRotation: (props: StyleProps) => ({
    transform: `rotate(${-extractRotation(props.matrix)}rad)`,
  }),
})

const Context = createContext<string>('default_class_name')
export const Provider = Context.Provider
export const useClass = () => useContext(Context)
