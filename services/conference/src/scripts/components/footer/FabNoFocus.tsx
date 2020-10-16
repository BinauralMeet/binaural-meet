import {PropTypes} from '@material-ui/core'
import Fab from '@material-ui/core/Fab'
import {makeStyles} from '@material-ui/core/styles'
import React from 'react'

const useStyles = makeStyles((theme) => {
  return ({
    margin: {
      margin: theme.spacing(1),
      pointerEvents: 'auto',
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
  onClick?: (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void,
  color?: PropTypes.Color
}

export const FabMain: React.FC<MyFabProps> = (props) => {
  const classes = useStyles()

  return <Fab className= {classes.margin} size = "small" onClick = {props.onClick}
  color = {props.color} onFocus = {(e) => { (e.target as HTMLElement)?.blur() }} >
        {props.children}
      </Fab>
}

export const FabSub: React.FC<MyFabProps> = (props) => {
  const classes = useStyles()

  return <Fab className= {classes.small} size = "small" onClick = {props.onClick}
  color = {props.color} onFocus = {(e) => { (e.target as HTMLElement)?.blur() }} >
        {props.children}
      </Fab>
}
