import {OverlayPortal} from '@components/utils/OverlayPortal'
import Paper from '@material-ui/core/Paper'
import {makeStyles} from '@material-ui/core/styles'
import React from 'react'

interface ConfigurationDialogProps {
  position: [number, number]
}

type StyleProps = Pick<ConfigurationDialogProps, 'position'>

const useStyles = makeStyles({
  root: (props: StyleProps) => ({
    position: 'absolute',
    left: props.position[0],
    top: props.position[1],
  }),
})

export const ConfigurationDialog: React.FC<ConfigurationDialogProps> = (props) => {
  const className = useStyles(props)

  return <OverlayPortal>
    <Paper className={className.root}>
      {props.children}
    </Paper>
  </OverlayPortal>
}
