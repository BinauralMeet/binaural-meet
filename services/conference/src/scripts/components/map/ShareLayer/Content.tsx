
import GoogleDriveIcon from '@iconify/icons-mdi/google-drive'
import {Icon} from '@iconify/react'
import {makeStyles} from '@material-ui/core/styles'
import HttpIcon from '@material-ui/icons/Http'
import PhotoIcon from '@material-ui/icons/Photo'
import ScreenShareIcon from '@material-ui/icons/ScreenShare'
import SubjectIcon from '@material-ui/icons/Subject'
import YouTubeIcon from '@material-ui/icons/YouTube'
import {ContentType, SharedContent as ISharedContent} from '@models/SharedContent'
import React from 'react'
import {GDrive} from './GDrive'
import {ScreenContent} from './ScreenContent'
import {Text} from './Text'
import {YouTube} from './YouTube'

export function contentTypeIcons(type: ContentType, size = 12) {
  const icons = {
    img: <PhotoIcon style={{fontSize:size}} />,
    text:<SubjectIcon style={{fontSize:size}} />,
    iframe: <HttpIcon style={{fontSize:size}} />,
    youtube: <YouTubeIcon style={{fontSize:size}} />,
    screen: <ScreenShareIcon style={{fontSize:size}} />,
    gdrive: <span style={{width:size, height:size}}><Icon icon={GoogleDriveIcon} height={size} /></span>,
    '': undefined,
  }

  return icons[type]
}

const CONTENTLOG = false
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
})
export interface ContentProps{
  content:ISharedContent
  onUpdate?: (newContent: ISharedContent) => void
  editing: boolean
  setEditing: (editing:boolean) => void
}
export const Content: React.FC<ContentProps> = (props:ContentProps) => {
  const classes = useStyles()

  let rv
  if (props.content.type === 'img') {
    rv = <img className={classes.img} src={props.content.url} />
  }else if (props.content.type === 'iframe') {
    rv = <div className={classes.div}
      onDoubleClick = {() => { if (!props.editing) { props.setEditing(true) } }}
      onPointerLeave = {() => { if (props.editing) { props.setEditing(false) } }}
    >
      <iframe className={props.editing ? classes.iframeEdit : classes.iframe} src={props.content.url} />
      </div>
      // hasevr  width of iframe is too wide but I could not find way to change. Below not work.
      // width={props.content.size[0] - 4} height={props.content.size[1] - 2}
  }else if (props.content.type === 'youtube') {
    rv = <YouTube {...props} />
  }else if (props.content.type === 'gdrive') {
    rv = <GDrive {...props} />
  }else if (props.content.type === 'text') {
    rv = <Text {...props} />
  }else if (props.content.type === 'screen') {
    rv = <ScreenContent {...props} />
  }else {
    rv = <div>Unknow type:{props.content.type} for {props.content.url}</div>
  }

  return rv
}
