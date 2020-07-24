import {ConfigurationDialog, resolveConfigurationPlugin} from '@components/configuration'
import IconButton from '@material-ui/core/IconButton'
import Popover from '@material-ui/core/Popover'
import Tooltip from '@material-ui/core/Tooltip'
import Zoom from '@material-ui/core/Zoom'
import MoreVertIcon from '@material-ui/icons/MoreVert'
import React, {useState} from 'react'

interface ConfigurationButtonProps {
  plugin: string
  show: boolean
  className?: string
}

export const ConfigurationButton: React.FC<ConfigurationButtonProps> = (props) => {
  const {
    plugin,
    className,
    show,
  } = props

  const [anchorEl, setAnchorEl] = React.useState<HTMLButtonElement | null>(null)
  const handleClick = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    setShowConfig(true)
    setAnchorEl(event.currentTarget)
  }


  const [showConfig, setShowConfig] = useState<boolean>(false)
  const [dialogPosition, setDialogPosition] = useState<[number, number]>([0, 0])
  const ConfigurationPlugin = resolveConfigurationPlugin(plugin)
  const configuration = (
    <Popover
      open={showConfig} onClose={() => setShowConfig(false)}
      anchorReference={'anchorEl'}
      anchorEl={anchorEl}
    >
        <ConfigurationPlugin />
    </Popover>
  )

  const fab = (
    <div className={className}>
      <Zoom in={show}>
        <Tooltip title="Configure" aria-label="configure">
          <IconButton color="secondary" onClick={handleClick} size={'small'}>
            <MoreVertIcon />
          </IconButton>
        </Tooltip>
      </Zoom>
      {configuration}
    </div>
  )

  return fab
}
ConfigurationButton.displayName = 'ConfigurationButton'
