import {acceleratorText2El} from '@components/utils/formatter'
import {Tooltip} from '@material-ui/core'
import ListItem from '@material-ui/core/ListItem'
import ListItemAvatar from '@material-ui/core/ListItemAvatar'
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
  const fontSize = isSmartphone() ? '2.5em' : '1em'
  const item = <ListItem button dense={dense} onClick={onClick} style={{alignItems:'start'}}>
    {icon ? <ListItemAvatar style={{fontSize: fontSize, height:fontSize}}>
      {icon}
    </ListItemAvatar> : undefined }
    <ListItem style={{paddingLeft:0, paddingTop:0, paddingBottom:0}}>
      <div style={{fontSize: isSmartphone() ? '2.5em' : '1em', verticalAlign: 'middle'}}>
        {textEl}<br/>
        {secondEl}
      </div>
    </ListItem>
  </ListItem>

  return tip ? <Tooltip title={tip} placement="top-end" enterDelay={1000}>{item}</Tooltip> : item
}

