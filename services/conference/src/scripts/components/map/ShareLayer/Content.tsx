
import {makeStyles} from '@material-ui/core/styles'
import HttpIcon from '@material-ui/icons/Http'
import PhotoIcon from '@material-ui/icons/Photo'
import ScreenShareIcon from '@material-ui/icons/ScreenShare'
import SubjectIcon from '@material-ui/icons/Subject'
import YouTubeIcon from '@material-ui/icons/YouTube'
import {SharedContent as ISharedContent} from '@models/SharedContent'
import React, {useRef} from 'react'
import {ScreenContent} from './ScreenContent'
import {YouTube} from './YouTube'

export const contentTypeIcons = {
  img: <PhotoIcon />,
  text:<SubjectIcon />,
  iframe: <HttpIcon />,
  youtube: <YouTubeIcon />,
  screen: <ScreenShareIcon />,
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
    border: '2px gray solid',
  },
  iframeEdit: {
    width: '100%',
    height: '100%',
    border: '2px yellow solid',
  },
  div:{
    width: '100%',
    height: '100%',
  },
  text: {
    overflow: 'hidden',
  },
})
export interface ContentProps{
  content:ISharedContent
  onUpdate?: (newContent: ISharedContent) => void
}
export const Content: React.FC<ContentProps> = (props:ContentProps) => {
  const classes = useStyles()
  const ref = useRef<HTMLIFrameElement>(null)

  let rv
  if (props.content.type === 'img') {
    rv = <img className={classes.img} src={props.content.url} />
  }else if (props.content.type === 'iframe') {
    rv = <div className={classes.div}
      onDoubleClick = {() => { if (ref.current) { ref.current.className = classes.iframeEdit } }}
      onPointerLeave = {() => { if (ref.current) { ref.current.className = classes.iframe } }}
    >
      <iframe className={classes.iframe} src={props.content.url} ref={ref} />
      </div>
      // hasevr  width of iframe is too wide but I could not find way to change. Below not work.
      // width={props.content.size[0] - 4} height={props.content.size[1] - 2}
  }else if (props.content.type === 'youtube') {
    rv = <YouTube {...props} />
  }else if (props.content.type === 'text') {
    rv =  <div className={classes.text} >{props.content.url}</div>
  }else if (props.content.type === 'screen') {
    rv = <ScreenContent {...props} />
  }else {
    rv = <div className={classes.text} >Unknow type:{props.content.type} for {props.content.url}</div>
  }

  return rv
}
