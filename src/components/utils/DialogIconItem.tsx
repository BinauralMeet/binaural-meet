import {acceleratorText2El} from '@components/utils/formatter'
import {Tooltip} from '@material-ui/core'
import ListItem from '@material-ui/core/ListItem'
import ListItemAvatar from '@material-ui/core/ListItemAvatar'
import React from 'react'

interface DialogIconItemProps {
  icon?: JSX.Element
  text?: string
  plain?: string | JSX.Element
  secondEl?: JSX.Element
  tip?:JSX.Element | string
  dense?: boolean
  onClick?: () => void
}

const fontSize = '1.3em'
const height = '1em'

export const DialogIconItem: React.FC<DialogIconItemProps> = (props) => {
  const {
    icon,
    text,
    plain,
    secondEl,
    tip,
    dense,
    onClick,
  } = props
  const textEl = text ? acceleratorText2El(text) : undefined
  const item = <ListItem button={true} dense={dense} onClick={onClick} style={{alignItems:'start'}}>
    {icon ? <ListItemAvatar style={{fontSize, height}}>{icon}
    </ListItemAvatar>
     : undefined } &nbsp;
    <div style={{verticalAlign: 'middle'}}>
      {textEl ? textEl : plain}
      {secondEl ? <><br/>{secondEl}</> : undefined}
    </div>
  </ListItem>

  return tip ? <Tooltip title={tip} placement="top-end" enterDelay={1000}>{item}</Tooltip> : item
}

interface DialogItemProps {
  icon?: JSX.Element
  text?: string
  plain?: string | JSX.Element
  secondEl?: JSX.Element
  tip?:JSX.Element | string
  dense?: boolean
}
export const DialogItem: React.FC<DialogItemProps> = (props) => {
  const {
    icon,
    text,
    plain,
    secondEl,
    tip,
    dense,
  } = props
  const textEl = text ? acceleratorText2El(text) : undefined
  const item = <ListItem dense={dense} button={false} style={{alignItems:'start'}}>
    {icon ? <ListItemAvatar style={{fontSize, height}}>
      {icon}
    </ListItemAvatar> : undefined }
    <div style={{verticalAlign: 'middle'}}>
      {textEl ? textEl : plain}
      {secondEl ? <><br/>{secondEl}</> : undefined}
    </div>
  </ListItem>

  return tip ? <Tooltip title={tip} placement="top-end" enterDelay={1000}>{item}</Tooltip> : item
}
