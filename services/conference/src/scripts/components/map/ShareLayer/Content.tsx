import {makeStyles} from '@material-ui/core/styles'
import {SharedContent as ISharedContent} from '@models/SharedContent'
import {useStore} from 'hooks/SharedContentsStore'
import React, {useMemo} from 'react'
import {YouTube} from './YouTube'

const CONTENTLOG = true
export const contentLog = CONTENTLOG ? console.log : (a:any) => {}

const useStyles = makeStyles({
  img: {
    width: '100%',
    height: '100%',
    verticalAlign: 'bottom',
    userDrag: 'none',
  },
  iframe: {
    width: '100%',
    height: '100%',
  },
  text: {
    overflow: 'hidden',
  },
})
export interface ContentProps{
  content:ISharedContent
}
export const Content: React.FC<ContentProps> = (props:ContentProps) => {
  const classes = useStyles()

  let rv
  if (props.content.type === 'img') {
    rv = <img className={classes.img} src={props.content.url} />
  }else if (props.content.type === 'iframe') {
    rv = <iframe className={classes.iframe} src={props.content.url} />
  }else if (props.content.type === 'youtube') {
    rv = <YouTube content = {props.content} />
  }else if (props.content.type === 'text') {
    rv =  <div className={classes.text} >{props.content.url}</div>
  }else {
    rv = <div className={classes.text} >Unknow type:{props.content.type} for {props.content.url}</div>
  }

  return rv
}
