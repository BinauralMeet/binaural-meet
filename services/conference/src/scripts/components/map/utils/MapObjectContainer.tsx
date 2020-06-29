import IconButton from '@material-ui/core/IconButton'
import {makeStyles} from '@material-ui/core/styles'
import Tooltip from '@material-ui/core/Tooltip'
import Zoom from '@material-ui/core/Zoom'
import MoreVertIcon from '@material-ui/icons/MoreVert'
import {MapObject, Pose2DMap} from '@models/MapObject'
import React, {useState} from 'react'
import {useValue as useTransform} from './useTransform'

interface MapObjectContainerProps extends Partial<MapObject> {
  pose: Pose2DMap
  disableRotation?: boolean
  openConfiuration?: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void
  buttonSpacing?: ButtonSpacing
  counterRotateButtons?: boolean
}

const defaultProps: Partial<MapObjectContainerProps> = {
  disableRotation: false,
  openConfiuration: undefined,
  buttonSpacing: undefined,
  counterRotateButtons: false,
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
  rootRotation: (props: StyleProps) => ({
    transform: `rotate(${props.orientation}deg)`,
  }),
  fab: (props: StyleProps) => ({
    position: 'absolute',
    top: props.spacing ? props.spacing.top : theme.spacing(2),
    right: props.spacing ? props.spacing.right : theme.spacing(2),
  }),
}))

const RawMapObjectContainer: React.ForwardRefRenderFunction<
HTMLDivElement, React.PropsWithChildren<MapObjectContainerProps>> = (props, ref) => {
  const {
    pose,
    disableRotation,
    openConfiuration,
    buttonSpacing,
    counterRotateButtons,
  } = Object.assign({}, defaultProps, props)

  const className = useStyles({
    ...pose,
    spacing: buttonSpacing,
  })

  const [showButton, setShowButton] = useState<boolean>(false)

  let fab = (
    <Zoom in={showButton}>
      <Tooltip className={className.fab} title="Configure" aria-label="configure">
        <IconButton color="secondary" onClick={openConfiuration} size={'small'}>
          <MoreVertIcon />
        </IconButton>
      </Tooltip>
    </Zoom>
  )

  const counterRotationClass = useTransform().counterRotationClass
  if (counterRotateButtons) {
    fab = (
      <div className={counterRotationClass}>
        {fab}
      </div>
    )
  }

  const rootClass = [className.root]
  if (!disableRotation) {
    rootClass.push(className.rootRotation)
  }

  return <div
    className={rootClass.join(' ')} ref={ref}
    onMouseOver={() => setShowButton(true)}
    onMouseOut={() => setShowButton(false)}
  >
    {props.children}
    {openConfiuration ? fab : undefined}
  </div>
}

export const MapObjectContainer = React.forwardRef(RawMapObjectContainer)
MapObjectContainer.displayName = 'MapObjectContainer'
