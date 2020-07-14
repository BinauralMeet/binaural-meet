import ListItem from '@material-ui/core/ListItem'
import ListItemAvatar from '@material-ui/core/ListItemAvatar'
import ListItemText from '@material-ui/core/ListItemText'
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

  return (
    <ListItem button={true} onClick={onClick}>
      <ListItemAvatar>
        {icon}
      </ListItemAvatar>
      <ListItemText>
        {text}
      </ListItemText>
    </ListItem>
  )
}
