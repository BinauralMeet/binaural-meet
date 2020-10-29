import {makeStyles} from '@material-ui/core/styles'
import HttpIcon from '@material-ui/icons/Http'
import PhotoIcon from '@material-ui/icons/Photo'
import SubjectIcon from '@material-ui/icons/Subject'
import YouTubeIcon from '@material-ui/icons/YouTube'
import {SharedContent as ISharedContent} from '@models/SharedContent'
import React, {useEffect, useRef} from 'react'
import {YouTube} from './YouTube'


export const contentTypeIcons = {
  img: <PhotoIcon />,
  text:<SubjectIcon />,
  iframe: <HttpIcon />,
  youtube: <YouTubeIcon />,
  '': undefined,
}

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
    pointerEvents: 'none',
  },
  iframeEdit: {
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

  const ref = useRef<HTMLIFrameElement>(null)
  const touchHandler = (ev:any) => {
    console.log('touchHandler called', ev)
  }
  useEffect(() => {
    if (ref.current) {
      console.log('event listener added', ref.current)
      ref.current.className = classes.iframe
      ref.current.contentWindow?.addEventListener('touchstart', (ev) => {
        console.log('contentWindow touchstart')
      },                                          true)
      ref.current.contentWindow?.addEventListener('mousemove', (ev) => {
        console.log('contentWindow mousemove')
      })
    }
  },
            [ref.current?.contentWindow?.window])

  let rv
  if (props.content.type === 'img') {
    rv = <img className={classes.img} src={props.content.url} />
  }else if (props.content.type === 'iframe') {
    const evt = new CustomEvent('mousedown', {bubbles: true, cancelable: false}) as any
    rv = <iframe className={classes.iframe} src={props.content.url} ref={ref} />
  }else if (props.content.type === 'youtube') {
    rv = <YouTube content = {props.content} />
  }else if (props.content.type === 'text') {
    rv =  <div className={classes.text} >{props.content.url}</div>
  }else {
    rv = <div className={classes.text} >Unknow type:{props.content.type} for {props.content.url}</div>
  }

  return rv
}
