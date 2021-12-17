import {BMProps} from '@components/utils'
import whiteboard24Regular from '@iconify/icons-fluent/whiteboard-24-regular'
import filePdfBox from '@iconify/icons-mdi/file-pdf-box'
import GoogleDriveIcon from '@iconify/icons-mdi/google-drive'
import {Icon} from '@iconify/react'
import {makeStyles} from '@material-ui/core/styles'
import CameraAltIcon from '@material-ui/icons/CameraAlt'
import HttpIcon from '@material-ui/icons/Http'
import PhotoIcon from '@material-ui/icons/Photo'
import ScreenShareIcon from '@material-ui/icons/ScreenShare'
import SubjectIcon from '@material-ui/icons/Subject'
import YouTubeIcon from '@material-ui/icons/YouTube'
import {ContentType, ISharedContent} from '@models/ISharedContent'
import {t} from '@models/locales'
import {useObserver} from 'mobx-react-lite'
import React from 'react'
import {GDrive} from './GDrive'
import {PDF} from './PDF'
import {PlaybackScreenContent} from './PlaybackScreenContent'
import {ScreenContent} from './ScreenContent'
import {Text} from './Text'
import {YouTube} from './YouTube'

export function contentTypeIcons(type: ContentType, size = 12, width = -1) {
  if (width < 0) { width = size }
  const icons = {
    img: <PhotoIcon style={{fontSize:size, width}} />,
    text:<SubjectIcon style={{fontSize:size, width}} />,
    iframe: <HttpIcon style={{fontSize:size, width}} />,
    youtube: <YouTubeIcon style={{fontSize:size, width}} />,
    screen: <ScreenShareIcon style={{fontSize:size, width}} />,
    gdrive: <span style={{width, height:size}}><Icon icon={GoogleDriveIcon} height={size} /></span>,
    whiteboard: <span style={{width, height:size}}><Icon icon={whiteboard24Regular} height={size} /></span>,
    camera: <CameraAltIcon style={{fontSize:size, width}} />,
    pdf : <span style={{width, height:size}}><Icon icon={filePdfBox} height={size} /></span>,
    playbackScreen: <ScreenShareIcon style={{fontSize:size, width}} />,
    playbackCamera: <CameraAltIcon style={{fontSize:size, width}} />,
    '': undefined,
  }

  return icons[type]
}
export function editButtonTip(editing: boolean, c?: ISharedContent){
  const type = c ? c.type : ''
  if (type === 'whiteboard'){
    return editing ? t('ctEndEditWhiteboard') : t('ctEditWhiteboard')
  }else if (type === 'gdrive'){
    return editing ? t('ctEndEditGDrive') : t('ctEditGDrive')
  }else if (type === 'youtube'){
    return editing ? t('ctEndEditYoutube') : t('ctEditYoutube')
  }else if (type === 'iframe'){
    return editing ? t('ctEndEditIframe') : t('ctEditIframe')
  }else if (type === 'text'){
    return editing ? t('ctEndEditText') : t('ctEditText')
  }

  return ''
}


const useStyles = makeStyles({
  img: {
    width: '100%',
    height: '100%',
    verticalAlign: 'bottom',
    userDrag: 'none',
    pointerEvents: 'none',
  },
  iframe: {
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    border: 'none',
  },
  iframeEdit: {
    width: '100%',
    height: '100%',
    border: 'none',
  },
  div:{
    width: '100%',
    height: '100%',
  },
})
export interface ContentProps extends BMProps{
  content:ISharedContent
  updateAndSend: (c: ISharedContent) => void
  updateOnly: (c:ISharedContent) => void
}
export const RawContent: React.FC<ContentProps> = (props:ContentProps) => {
  const classes = useStyles()
  const editing = useObserver(() => props.stores.contents.editing === props.content.id)

  let rv
  if (props.content.type === 'img') {
    rv = <img className={classes.img} src={props.content.url} alt={props.content.name}/>
  }else if (props.content.type === 'iframe' || props.content.type === 'whiteboard') {
    rv = <div className={classes.div}>
      <iframe className={editing ? classes.iframeEdit : classes.iframe}
        style={props.content.type==='whiteboard'?{backgroundColor: props.content.noFrame?'rgba(0,0,0,0)':'white'}:{}}
        src={props.content.url} key={props.content.name} title={props.content.name}/>
      </div>
  }else if (props.content.type === 'youtube') {
    rv = <YouTube {...props} />
  }else if (props.content.type === 'gdrive') {
    rv = <GDrive {...props} />
  }else if (props.content.type === 'pdf') {
    rv = <PDF {...props} />
  }else if (props.content.type === 'text') {
    rv = <Text {...props} />
  }else if (props.content.type === 'screen' || props.content.type === 'camera') {
    rv = <ScreenContent {...props} />
  }else if (props.content.type === 'playbackScreen' || props.content.type === 'playbackCamera') {
    rv = <PlaybackScreenContent {...props} />
  }else {
    rv = <div>Unknown type:{props.content.type} for {props.content.url}</div>
  }

  return rv
}

export const Content = (props: ContentProps) =>
  React.useMemo(() => <RawContent {...props} />,
  //  eslint-disable-next-line react-hooks/exhaustive-deps
  [props.content.url, props.content.id, props.content.type, props.stores.contents.editing === props.content.id,
   props.content.pose, props.content.size, props.content.originalSize])
Content.displayName = 'Content'
