import IconButton from '@material-ui/core/IconButton'
import {makeStyles} from '@material-ui/core/styles'
import Tooltip from '@material-ui/core/Tooltip'
import Zoom from '@material-ui/core/Zoom'
import MoreVertIcon from '@material-ui/icons/MoreVert'
import {Pose2DMap} from '@models/MapObject'
import React, {useState} from 'react'

interface MapObjectContainerProps {
  pose: Pose2DMap
  openConfiuration?: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void
  buttonSpacing?: ButtonSpacing
}

interface ButtonSpacing {
  top: number,
  right: number,
}

type StyleProps = Pose2DMap & {
  spacing?: ButtonSpacing,
}

const useStyles = makeStyles(theme => ({
  root: (props: StyleProps) => ({
    position: 'absolute',
    left: props.position[0],
    top: props.position[1],
  }),
  fab: (props: StyleProps) => ({
    position: 'absolute',
    top: props.spacing ? props.spacing.top : theme.spacing(2),
    right: props.spacing ? props.spacing.right : theme.spacing(2),
  }),
}))

const RawMapObjectContainer: React.ForwardRefRenderFunction<
HTMLDivElement, React.PropsWithChildren<MapObjectContainerProps>> = (props, ref) => {
  const className = useStyles({
    ...props.pose,
    spacing: props.buttonSpacing,
  })

  const [showButton, setShowButton] = useState<boolean>(false)

  const fab = (
    <Zoom in={showButton}>
      <Tooltip className={className.fab} title="Configure" aria-label="configure">
        <IconButton color="secondary" onClick={props.openConfiuration} size={'small'}>
          <MoreVertIcon />
        </IconButton>
      </Tooltip>
    </Zoom>
  )

  return <div
    className={className.root} ref={ref}
    onMouseOver={() => setShowButton(true)}
    onMouseOut={() => setShowButton(false)}
  >
    {props.children}
    {props.openConfiuration ? fab : undefined}
  </div>
}

export const MapObjectContainer = React.forwardRef(RawMapObjectContainer)
MapObjectContainer.displayName = 'MapObjectContainer'
