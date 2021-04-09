import {acceleratorText2El} from '@components/utils/formatter'
import ListItem from '@material-ui/core/ListItem'
import ListItemAvatar from '@material-ui/core/ListItemAvatar'
import ListItemText from '@material-ui/core/ListItemText'
import {isSmartphone} from '@models/utils'
import React from 'react'

interface ShareDialogItemProps {
  icon: JSX.Element
  text: string
  onClick: () => void
}

export const ShareDialogItem: React.FC<ShareDialogItemProps> = (props) => {
  const {
    icon,
    text,
    onClick,
  } = props
  const textEl = acceleratorText2El(text)

  return (
    <ListItem button={true} onClick={onClick}>
      <ListItemAvatar style={{fontSize: isSmartphone() ? '2.5em' : '1em'}}>
        {icon}
      </ListItemAvatar>
      <ListItemText style={{fontSize: isSmartphone() ? '2.5em' : '1em'}}>
        {textEl}
      </ListItemText>
    </ListItem>
  )
}
