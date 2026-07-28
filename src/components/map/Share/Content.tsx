import {makeStyles} from '@material-ui/core/styles'
import {ContentType, ISharedContent} from '@models/ISharedContent'
import {observer} from 'mobx-react-lite'
import React from 'react'
import {GDrive} from './GDrive'
import {PDF} from './PDF'
import {PlaybackScreenContent} from './PlaybackScreenContent'
import {ScreenContent} from './ScreenContent'
import {Text} from './Text'
import {YouTube} from './YouTube'
import {contentSyncService} from '@stores/'
import {contentTypeIcons, editButtonTip} from './contentUtils'
export {contentTypeIcons, editButtonTip}

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

export interface ContentProps{
  content:ISharedContent
  updateAndSend: (c: ISharedContent) => void
  updateOnly: (c:ISharedContent) => void
}

// Render extra context available to all content renderers.
interface RenderContext {
  classes: Record<string, string>
  editing: boolean
}

// Map from ContentType to its renderer component.
// The fallback key (empty string) is used for unknown types.
type ContentRenderer = (props: ContentProps, ctx: RenderContext) => React.ReactNode

const contentRenderers: Partial<Record<ContentType, ContentRenderer>> & { '': ContentRenderer } = {
  img: (props, {classes}) =>
    <img className={classes.img} src={props.content.url} alt={props.content.name}/>,

  iframe: (props, {classes, editing}) =>
    <div className={classes.div}>
      <iframe className={editing ? classes.iframeEdit : classes.iframe}
        src={props.content.url} key={props.content.name} title={props.content.name}/>
    </div>,

  whiteboard: (props, {classes, editing}) =>
    <div className={classes.div}>
      <iframe className={editing ? classes.iframeEdit : classes.iframe}
        style={{backgroundColor: props.content.noFrame ? 'rgba(0,0,0,0)' : 'white'}}
        src={props.content.url} key={props.content.name} title={props.content.name}/>
    </div>,

  youtube: (props) => <YouTube {...props} />,
  gdrive: (props) => <GDrive {...props} />,
  pdf: (props) => <PDF {...props} />,
  text: (props) => <Text {...props} />,
  screen: (props) => <ScreenContent {...props} />,
  camera: (props) => <ScreenContent {...props} />,
  playbackScreen: (props) => <PlaybackScreenContent {...props} />,
  playbackCamera: (props) => <PlaybackScreenContent {...props} />,

  '': (props) => <div>Unknown type:{props.content.type} for {props.content.url}</div>,
}

export const RawContent: React.FC<ContentProps> = observer((props:ContentProps) => {
  const classes = useStyles()
  const editing = contentSyncService.editing === props.content.id
  const renderer = contentRenderers[props.content.type] ?? contentRenderers['']

  return <>{renderer(props, {classes, editing})}</>
})

export const Content = React.memo(
  (props: ContentProps) =>
    React.useMemo(() => <RawContent {...props} />,
    //  eslint-disable-next-line react-hooks/exhaustive-deps
    [props.content.url, props.content.id, props.content.type, contentSyncService.editing === props.content.id,
     props.content.pose, props.content.size, props.content.originalSize]),
  (prev, next) =>
    prev.content.id === next.content.id
)
Content.displayName = 'Content'
