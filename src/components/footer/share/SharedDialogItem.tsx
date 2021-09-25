import {acceleratorText2El} from '@components/utils/formatter'
import ListItem from '@material-ui/core/ListItem'
import ListItemAvatar from '@material-ui/core/ListItemAvatar'
import ListItemText from '@material-ui/core/ListItemText'
import {isSmartphone} from '@models/utils'
import React from 'react'

interface ShareDialogItemProps {
  icon?: JSX.Element
  text: string
  secondEl?: JSX.Element
  onClick?: () => void
  dense?: boolean
}

export const ShareDialogItem: React.FC<ShareDialogItemProps> = (props) => {
  const {
    icon,
    text,
    onClick,
  } = props
  const textEl = acceleratorText2El(text)

  return icon ?
    <ListItem button dense={props.dense} onClick={onClick}>
      <ListItemAvatar style={{fontSize: isSmartphone() ? '2.5em' : '1em'}}>
        {icon}
      </ListItemAvatar>
      <ListItemText style={{fontSize: isSmartphone() ? '2.5em' : '1em'}}
        primary={textEl} secondary={props.secondEl} />
      {props.children}
    </ListItem> :
    <ListItem  dense={props.dense} onClick={onClick}>
      <ListItemText style={{fontSize: isSmartphone() ? '2.5em' : '1em'}}
        primary={textEl} secondary={props.secondEl} />
      {props.children}
    </ListItem>
}
