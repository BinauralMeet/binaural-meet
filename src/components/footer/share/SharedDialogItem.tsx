import {acceleratorText2El} from '@components/utils/formatter'
import {Tooltip} from '@material-ui/core'
import ListItem from '@material-ui/core/ListItem'
import ListItemAvatar from '@material-ui/core/ListItemAvatar'
import ListItemText from '@material-ui/core/ListItemText'
import {isSmartphone} from '@models/utils'
import React from 'react'

interface ShareDialogItemProps {
  icon?: JSX.Element
  text: string
  secondEl?: JSX.Element
  tip?:JSX.Element | string
  dense?: boolean
  onClick?: () => void
}

export const ShareDialogItem: React.FC<ShareDialogItemProps> = (props) => {
  const {
    icon,
    text,
    secondEl,
    tip,
    dense,
    onClick,
  } = props
  const textEl = acceleratorText2El(text)
  const item = <ListItem button dense={dense} onClick={onClick}>
    {icon ? <ListItemAvatar style={{fontSize: isSmartphone() ? '2.5em' : '1em'}}>
      {icon}
    </ListItemAvatar> : undefined }
    <ListItemText style={{fontSize: isSmartphone() ? '2.5em' : '1em'}}
      primary={textEl} secondary={secondEl} />
      {props.children}
  </ListItem>

  return tip ? <Tooltip title={tip} placement="top-end" enterDelay={1000}>{item}</Tooltip> : item
  }
