import whiteboard24Regular from '@iconify-icons/fluent/whiteboard-24-regular'
import filePdfBox from '@iconify/icons-mdi/file-pdf-box'
import GoogleDriveIcon from '@iconify/icons-mdi/google-drive'
import {Icon} from '@iconify/react'
import CameraAltIcon from '@material-ui/icons/CameraAlt'
import HttpIcon from '@material-ui/icons/Http'
import PhotoIcon from '@material-ui/icons/Photo'
import ScreenShareIcon from '@material-ui/icons/ScreenShare'
import SubjectIcon from '@material-ui/icons/Subject'
import YouTubeIcon from '@material-ui/icons/YouTube'
import {ContentType} from '@models/SharedContent'

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
    '': undefined,
  }

  return icons[type]
}
