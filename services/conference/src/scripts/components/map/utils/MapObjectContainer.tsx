import {makeStyles} from '@material-ui/core/styles'
import {Pose2DMap} from '@models/MapObject'
import React from 'react'

interface MapObjectContainerProps {
  pose: Pose2DMap
}

type StyleProps = Pose2DMap

const useStyles = makeStyles({
  root: (props: StyleProps) => ({
    position: 'absolute',
    left: props.position[0],
    top: props.position[1],
  }),
})

const RawMapObjectContainer: React.ForwardRefRenderFunction<
HTMLDivElement, React.PropsWithChildren<MapObjectContainerProps>> = (props, ref) => {
  const className = useStyles(props.pose)

  return <div className={className.root} ref={ref}>
    {props.children}
  </div>
}

export const MapObjectContainer = React.forwardRef(RawMapObjectContainer)
MapObjectContainer.displayName = 'MapObjectContainer'
