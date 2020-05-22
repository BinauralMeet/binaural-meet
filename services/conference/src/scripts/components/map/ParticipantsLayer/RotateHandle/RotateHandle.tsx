import {BaseProps} from '@components/utils'
import {makeStyles} from '@material-ui/core/styles'
import {degree2Radian} from '@models/utils'
import React from 'react'
import {Handle} from './Handle'

type RotateHandleProps = BaseProps & StyleProps

const SIZE_HANDLE_RATIO = 6

export const RotateHandle: React.FC < RotateHandleProps > = (props) => {
  const {
    size,
    orientation,
    className,
  } = props
  const handleSize = props.size / SIZE_HANDLE_RATIO
  const radius = props.size / 2 - handleSize / 2

  const handlePosition: [number, number] = [
    -Math.sin(degree2Radian(props.orientation)),
    Math.cos(degree2Radian(props.orientation)),
  ].map(val => props.size / 2 + val * radius) as [number, number]

  const classes = useStyles({
    size,
    orientation,
  })

  return <div className={[classes.root, className].join(' ')}>
    <Handle size={handleSize} position={handlePosition} />
  </div>
}
RotateHandle.displayName = 'RotateHandle'


interface StyleProps {
  size: number,
  orientation: number,
}
const useStyles = makeStyles({
  root: (props: StyleProps) => ({
    position: 'absolute',
    width: props.size,
    height: props.size,
    transform: `translate(-${props.size / 2}px, -${props.size / 2}px)`,
  }),
})
