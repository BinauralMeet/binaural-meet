import Fab from '@material-ui/core/Fab'
import {makeStyles} from '@material-ui/core/styles'
import React, {useState, useRef} from 'react'
import {MoreButton, IconColor, FabColor, moreButtonControl, MoreButtonMember} from '@components/utils/MoreButton'

const useStyles = makeStyles((theme) => {
  return ({
    container: {
      margin: theme.spacing(2),
      pointerEvents: 'auto',
      fontSize: 'large',
    },
    small: {
      transform: 'scale(0.5)',
      margin: '1.2em 0 0 -2.1em',
      pointerEvents: 'auto',
    },
  })
})


interface MyFabProps{
  children: React.ReactElement,
  onClick?: (e: React.PointerEvent<HTMLButtonElement>) => void,
  onClickMore?: (e: React.PointerEvent<HTMLButtonElement>|React.MouseEvent<HTMLButtonElement>) => void,
  more?: boolean
  color?: FabColor
  iconColor?: IconColor
  htmlColor?: string
}

export const FabMain: React.FC<MyFabProps> = (props) => {
  const classes = useStyles()
  const [showMore, setShowMore] = useState<boolean>(false)
  const memberRef = useRef<MoreButtonMember>({timeout:undefined})
  const member = memberRef.current

  return <span className={classes.container}
    {...moreButtonControl(setShowMore, member)}
  >
    <Fab
      onClick = {props.onClick}
      onContextMenu={(ev)=>{
        ev.preventDefault()
        if (props.onClickMore){ props.onClickMore(ev) }
      }}
      color = {props.color} onFocus = {(e) => { (e.target as HTMLElement)?.blur() }}>
      {props.children}
    </Fab>
    {props.more ? <MoreButton style={{position:'relative', top:-25, left:-10, marginRight:-30}}
    show={showMore} color={props.color} htmlColor={props.htmlColor} iconColor={props.iconColor}
    onClickMore = {props.onClickMore}
    /> : undefined}
  </span>
}

export const FabSub: React.FC<MyFabProps> = (props) => {
  const classes = useStyles()

  return <Fab className= {classes.small} size = "small" onClick = {props.onClick}
  color = {props.color} onFocus = {(e) => { (e.target as HTMLElement)?.blur() }} >
        {props.children}
      </Fab>
}
