import {makeStyles} from '@material-ui/core/styles'
import {CallMissedSharp} from '@material-ui/icons'
import {MapObject, Pose2DMap} from '@models/MapObject'
import React, {useState} from 'react'
import {ConfigurationButton} from './ConfigurationButton'
import {useValue as useTransform} from './useTransform'

interface MapObjectContainerProps extends Partial<MapObject> {
  pose: Pose2DMap
  disableRotation?: boolean
  configurationPluginName?: string
  buttonSpacing?: ButtonSpacing
  counterRotateButtons?: boolean
  color: string
}

const defaultProps: Partial<MapObjectContainerProps> = {
  disableRotation: false,
  configurationPluginName: undefined,
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
    configurationPluginName,
    buttonSpacing,
    counterRotateButtons,
  } = Object.assign({}, defaultProps, props)

  const className = useStyles({
    ...pose,
    spacing: buttonSpacing,
  })

  const [showButton, setShowButton] = useState<boolean>(false)

  let fab = configurationPluginName ? React.createElement(ConfigurationButton, {
    plugin: configurationPluginName,
    className: className.fab,
    show: showButton,
    color: props.color,
  }) : undefined

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
    {configurationPluginName  ? fab : undefined}
  </div>
}

export const MapObjectContainer = React.forwardRef(RawMapObjectContainer)
MapObjectContainer.displayName = 'MapObjectContainer'
