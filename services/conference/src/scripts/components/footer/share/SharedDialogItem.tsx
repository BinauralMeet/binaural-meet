import ListItem from '@material-ui/core/ListItem'
import ListItemAvatar from '@material-ui/core/ListItemAvatar'
import ListItemText from '@material-ui/core/ListItemText'
import {assert} from '@models/utils'
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
  const texts = text.split('_')
  assert(texts.length <= 2)
  const textEl = <>{texts[0]}{texts[1] ?
     <><strong>{texts[1].substr(0, 1)}</strong>{texts[1].substr(1)}</> : undefined}</>

  return (
    <ListItem button={true} onClick={onClick}>
      <ListItemAvatar>
        {icon}
      </ListItemAvatar>
      <ListItemText>
        {textEl}
      </ListItemText>
    </ListItem>
  )
}
