import clipboardCopy from '@iconify-icons/heroicons-outline/clipboard-copy'
import maximizeIcon from '@iconify-icons/tabler/arrows-maximize'
import minimizeIcon from '@iconify-icons/tabler/arrows-minimize'
import pinIcon from '@iconify/icons-mdi/pin'
import pinOffIcon from '@iconify/icons-mdi/pin-off'
import {Icon} from '@iconify/react'
import {Tooltip} from '@material-ui/core'
import {makeStyles} from '@material-ui/core/styles'
import {CreateCSSProperties} from '@material-ui/core/styles/withStyles'
import DoneIcon from '@material-ui/icons/CheckCircle'
import CloseRoundedIcon from '@material-ui/icons/CloseRounded'
import EditIcon from '@material-ui/icons/Edit'
import FlipToBackIcon from '@material-ui/icons/FlipToBack'
import FlipToFrontIcon from '@material-ui/icons/FlipToFront'
import MoreHorizIcon from '@material-ui/icons/MoreHoriz'
import PlayArrowIcon from '@material-ui/icons/PlayArrow'
import settings from '@models/api/Settings'
import {doseContentEditingUseKeyinput, isContentEditable, isContentMaximizable, ISharedContent} from '@models/ISharedContent'
import {t} from '@models/locales'
import {Pose2DMap} from '@models/utils'
import {addV2, extractScaleX, extractScaleY, mulV, rotateVector2DByDegree, subV2} from '@models/utils'
import {copyContentToClipboard, moveContentToBottom, moveContentToTop} from '@stores/sharedContents/SharedContentCreator'
import {TITLE_HEIGHT} from '@stores/sharedContents/SharedContents'
import _ from 'lodash'
import {useObserver} from 'mobx-react-lite'
import React, {useEffect, useLayoutEffect, useRef, useState} from 'react'
import {Rnd} from 'react-rnd'
import {useGesture} from 'react-use-gesture'
import { FullGestureState, UserHandlersPartial } from 'react-use-gesture/dist/types'
import {Content, contentTypeIcons, editButtonTip} from './Content'
import {ISharedContentProps} from './SharedContent'
import {SharedContentForm} from './SharedContentForm'

const MOUSE_RIGHT = 2

export type MouseOrTouch = React.MouseEvent | React.TouchEvent
export interface RndContentProps extends ISharedContentProps {
  hideAll ?: boolean
  autoHideTitle ?: boolean
  onShare ?: (evt: MouseOrTouch) => void
  onClose: (evt: MouseOrTouch) => void
  updateAndSend: (c: ISharedContent) => void
  updateOnly: (c: ISharedContent) => void
}
interface StyleProps{
  props: RndContentProps,
  pose: Pose2DMap,
  size: [number, number],
  showTitle: boolean,
  pinned: boolean,
  dragging: boolean
  editing: boolean
}
class RndContentMember{
  buttons = 0
  dragCanceled = false
}


//  -----------------------------------------------------------------------------------
//  The RnDContent component
export const RndContent: React.FC<RndContentProps> = (props:RndContentProps) => {
  /*
  function rotateG2C(gv: [number, number]) {
    const lv = mapData.rotateFromWindow(gv)
    const cv = rotateVector2DByDegree(-pose.orientation, lv)
    //  console.log('rotateG2C called ori', pose.orientation, ' tran:', transform.rotation)

    return cv
  }*/
  /*
  function rotateG2L(gv: [number, number]) {
    const lv = transform.rotateG2L(gv)

    return lv
  }
  function rotateC2G(cv: [number, number]) {
    const lv = rotateVector2DByDegree(pose.orientation, cv)
    const gv = transform.rotateL2G(lv)

    return gv
  }*/

  // states
  const [pose, setPose] = useState(props.content.pose)  //  pose of content
  const [size, setSize] = useState(props.content.size)  //  size of content
  const [resizeBase, setResizeBase] = useState(size)    //  size when resize start
  const [resizeBasePos, setResizeBasePos] = useState(pose.position)    //  position when resize start
  const [showTitle, setShowTitle] = useState(!props.autoHideTitle || !props.content.pinned)
  const [showForm, setShowForm] = useState(false)
  const [preciseOrientation, setPreciseOrientation] = useState(pose.orientation)
  const [dragging, setDragging] = useState(false)
  const rnd = useRef<Rnd>(null)                         //  ref to rnd to update position and size
  const {contents, map} = props.stores
  const editing = useObserver(() => contents.editing === props.content.id)
  const zoomed = useObserver(() => map.zoomed)
  function setEditing(flag: boolean) { contents.setEditing(flag ? props.content.id : '') }
  const memberRef = useRef<RndContentMember>(new RndContentMember())
  const member = memberRef.current

  useEffect(  //  update pose
    ()=> {
      member.dragCanceled = true
      if (!_.isEqual(size, props.content.size)) {
        setSize(_.cloneDeep(props.content.size))
      }
      if (!_.isEqual(pose, props.content.pose)) {
        setPose(_.cloneDeep(props.content.pose))
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [props.content],
  )

  function setPoseAndSizeToRnd(){
    if (rnd.current) { rnd.current.resizable.orientation = pose.orientation + map.rotation }
    const titleHeight = showTitle ? TITLE_HEIGHT : 0
    rnd.current?.updatePosition({x:pose.position[0], y:pose.position[1] - titleHeight})
    rnd.current?.updateSize({width:size[0], height:size[1] + titleHeight})
  }
  useLayoutEffect(  //  reflect pose etc. to rnd size
    () => {
      setPoseAndSizeToRnd()
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pose, size, showTitle, map.rotation],
  )

  //  handlers
  function stop(ev:MouseOrTouch|React.PointerEvent) {
    ev.stopPropagation()
    ev.preventDefault()
  }
  function onClickShare(evt: MouseOrTouch) {
    stop(evt)
    props.onShare?.call(null, evt)
  }
  function onClickClose(evt: MouseOrTouch) {
    stop(evt)
    props.onClose?.call(null, evt)
  }
  function onClickEdit(evt: MouseOrTouch) {
    stop(evt)
    setEditing(!editing)
  }
  function onClickMoveToTop(evt: MouseOrTouch) {
    stop(evt)
    moveContentToTop(props.content)
    props.updateAndSend(props.content)
  }
  function onClickMoveToBottom(evt: MouseOrTouch) {
    stop(evt)
    moveContentToBottom(props.content)
    props.updateAndSend(props.content)
  }
  function onClickPin(evt: MouseOrTouch) {
    stop(evt)
    props.content.pinned = !props.content.pinned
    props.updateAndSend(props.content)
  }
  function onClickCopy(evt: MouseOrTouch){
    stop(evt)
    copyContentToClipboard(props.content)
  }
  function onClickMaximize(evt: MouseOrTouch){
    stop(evt)
    if (map.zoomed){
      map.restoreZoom()
    }else{
      map.zoomTo(props.content)
    }
  }
  function onClickMore(evt: MouseOrTouch){
    stop(evt)
    map.keyInputUsers.add('contentForm')
    setShowForm(true)
  }
  function onCloseForm(){
    setShowForm(false)
    if (props.content.pinned){
      setShowTitle(false)
    }
    map.keyInputUsers.delete('contentForm')
    props.updateAndSend(props.content)
  }
  function updateHandler() {
    if (JSON.stringify(pose) !== JSON.stringify(props.content.pose) ||
      JSON.stringify(size) !== JSON.stringify(props.content.size)) {
      props.content.size = [...size] //  Must be new object to compare the pose or size object.
      props.content.pose = {...pose} //  Must be new object to compare the pose or size object.
      props.updateAndSend(props.content)
    }
  }

  //  drag for title area
  function dragHandler(delta:[number, number], buttons:number, event:any) {
    if (member.dragCanceled){ return }
    const ROTATION_IN_DEGREE = 360
    const ROTATION_STEP = 15
    if (buttons === MOUSE_RIGHT) {
      setPreciseOrientation((preciseOrientation + delta[0] + delta[1]) % ROTATION_IN_DEGREE)
      let newOri
      if (event?.shiftKey || event?.ctrlKey) {
        newOri = preciseOrientation
      }else {
        newOri = preciseOrientation - preciseOrientation % ROTATION_STEP
      }
      //    mat.translateSelf(...addV2(props.pose.position, mulV(0.5, size)))
      const CENTER_IN_RATIO = 0.5
      const center = addV2(pose.position, mulV(CENTER_IN_RATIO, size))
      pose.position = addV2(pose.position,
                            subV2(rotateVector2DByDegree(pose.orientation - newOri, center), center))
      pose.orientation = newOri
      setPose(Object.assign({}, pose))
    }else {
      const lv = map.rotateFromWindow(delta)
      const cv = rotateVector2DByDegree(-pose.orientation, lv)
      pose.position = addV2(pose.position, cv)
      setPose(Object.assign({}, pose))
    }
  }

  const isFixed = (props.autoHideTitle && props.content.pinned)
  const handlerForTitle:UserHandlersPartial = {
    onDoubleClick: (evt)=>{
      if (isContentEditable(props.content)){
        stop(evt)
        setEditing(!editing)
      }
    },
    onDrag: ({down, delta, event, xy, buttons}) => {
      //  console.log('onDragTitle:', delta)
      if (isFixed) { return }
      event?.stopPropagation()
      if (down) {
        //  event?.preventDefault()
        dragHandler(delta, buttons, event)
      }
    },
    onDragStart: ({event, currentTarget, delta, buttons}) => {   // to detect click
      //  console.log(`dragStart delta=${delta}  buttons=${buttons}`)
      setDragging(true)
      member.buttons = buttons
      member.dragCanceled = false
      if (currentTarget instanceof Element && event instanceof PointerEvent){
        currentTarget.setPointerCapture(event?.pointerId)
      }
    },
    onDragEnd: ({event, currentTarget, delta, buttons}) => {
      //  console.log(`dragEnd delta=${delta}  buttons=${buttons}`)
      setDragging(false)
      if (!member.dragCanceled){ updateHandler() }
      member.dragCanceled = false

      if (currentTarget instanceof Element && event instanceof PointerEvent){
        currentTarget.releasePointerCapture(event?.pointerId)
      }
      if (!map.keyInputUsers.size && member.buttons === MOUSE_RIGHT){ //  right click
        setShowForm(true)
        map.keyInputUsers.add('contentForm')
      }
      member.buttons = 0
    },
    onPointerUp: (arg) => { if(editing) {arg.stopPropagation()} },
    onPointerDown: (arg) => { if(editing) {arg.stopPropagation()} },
    onMouseUp: (arg) => { if(editing) {arg.stopPropagation()} },
    onMouseDown: (arg) => { if(editing) {arg.stopPropagation()} },
    onTouchStart: (arg) => { if(editing) {arg.stopPropagation() }},
    onTouchEnd: (arg) => { if(editing) {arg.stopPropagation()} },
  }
  const handlerForContent:UserHandlersPartial = Object.assign({}, handlerForTitle)
  handlerForContent.onDrag = (args: FullGestureState<'drag'>) => {
    //  console.log('onDragBody:', args.delta)
    if (isFixed || map.keyInputUsers.has(props.content.id)) { return }
    handlerForTitle.onDrag?.call(this, args)
  }

  function onResizeStart(evt:React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>){
    member.dragCanceled = false
    evt.stopPropagation(); evt.preventDefault()
    setResizeBase(size)
    setResizeBasePos(pose.position)
  }
  function onResizeStop(){
    if (!member.dragCanceled){ updateHandler() }
    member.dragCanceled = false
  }
  function onResize(evt:MouseEvent | TouchEvent, dir: any, elem:HTMLDivElement, delta:any, pos:any) {
    evt.stopPropagation(); evt.preventDefault()
    //  console.log(`dragcancel:${member.dragCanceled}`)
    if (member.dragCanceled) {
      setPoseAndSizeToRnd()

      return
    }

    const scale = (extractScaleX(map.matrix) + extractScaleY(map.matrix)) / 2
    const cd:[number, number] = [delta.width / scale, delta.height / scale]
    // console.log('resize dir:', dir, ' delta:', delta, ' d:', d, ' pos:', pos)
    if (dir === 'left' || dir === 'right') {
      cd[1] = 0
    }
    if (dir === 'top' || dir === 'bottom') {
      cd[0] = 0
    }
    let posChange = false
    const deltaPos: [number, number] = [0, 0]
    if (dir === 'left' || dir === 'topLeft' || dir === 'bottomLeft') {
      deltaPos[0] = -cd[0]
      posChange = posChange || cd[0] !== 0
    }
    if (dir === 'top' || dir === 'topLeft' || dir === 'topRight') {
      deltaPos[1] = -cd[1]
      posChange = posChange || cd[1] !== 0
    }
    if (posChange) {
      pose.position = addV2(resizeBasePos, deltaPos)
      setPose(Object.assign({}, pose))
      //console.log(`setPose ${pose.position}`)
    }
    const newSize = addV2(resizeBase, cd)
    if (props.content.originalSize[0]) {
      const ratio = props.content.originalSize[0] / props.content.originalSize[1]
      if (newSize[0] > ratio * newSize[1]) { newSize[0] = ratio * newSize[1] }
      if (newSize[0] < ratio * newSize[1]) { newSize[1] = newSize[0] / ratio }
    }
    setSize(newSize)
  }


  const classes = useStyles({props, pose, size, showTitle, pinned:props.content.pinned, dragging, editing})
  //  console.log('render: TITLE_HEIGHT:', TITLE_HEIGHT)
  const contentRef = React.useRef<HTMLDivElement>(null)
  const formRef = React.useRef<HTMLDivElement>(null)
  const gestureForContent = useGesture(handlerForContent)
  const gestureForTitle = useGesture(handlerForTitle)
  const theContent =
    <div className={classes.rndContainer} {...gestureForContent()}>
      <div className={classes.titlePosition} {...gestureForTitle() /* title can be placed out of Rnd */}>
        <div className={classes.titleContainer}
            onMouseEnter = {() => { if (props.autoHideTitle) { setShowTitle(true) } }}
            onMouseLeave = {() => {
              if (props.autoHideTitle && !editing && props.content.pinned) { setShowTitle(false) } }}
            onTouchStart = {() => {
              if (props.autoHideTitle) {
                if (!showTitle) {
                  setShowTitle(true)
                }else if (props.content.pinned) {
                  setShowTitle(false)
                }
              }
            }}
            onContextMenu = {() => {
              setShowForm(true)
              map.keyInputUsers.add('contentForm')
            }}
            >
          <div className={classes.type}>
            {contentTypeIcons(props.content.type, TITLE_HEIGHT, TITLE_HEIGHT*1.1)}
          </div>
          <Tooltip placement="top" title={props.content.pinned ? t('ctUnpin') : t('ctPin')} >
          <div className={classes.pin} onClick={onClickPin} onTouchStart={stop}>
            <Icon icon={props.content.pinned ? pinIcon : pinOffIcon} height={TITLE_HEIGHT} width={TITLE_HEIGHT*1.1} />
          </div></Tooltip>
          <Tooltip placement="top" title={editButtonTip(editing, props.content)} >
            <div className={classes.edit} onClick={onClickEdit} onTouchStart={stop}>
             {
              editing ? <DoneIcon style={{fontSize:TITLE_HEIGHT}} />
                : <EditIcon style={{fontSize:TITLE_HEIGHT}} />}
            </div>
          </Tooltip>
          {props.content.pinned ? undefined :
            <Tooltip placement="top" title={t('ctMoveTop')} >
              <div className={classes.titleButton} onClick={onClickMoveToTop}
                onTouchStart={stop}><FlipToFrontIcon /></div></Tooltip>}
          {props.content.pinned ? undefined :
            <Tooltip placement="top" title={t('ctMoveBottom')} >
              <div className={classes.titleButton} onClick={onClickMoveToBottom}
                onTouchStart={stop}><FlipToBackIcon /></div></Tooltip>}

          {/*(props.content.pinned || !canContentBeAWallpaper(props.content)) ? undefined :
            <div className={classes.titleButton} onClick={onClickWallpaper}
              onTouchStart={stop}>
                <Tooltip placement="top" title={isContentWallpaper(props.content) ?
                  t('ctUnWallpaper') : t('ctWallpaper')}>
                  <div><WallpaperIcon />{isContentWallpaper(props.content) ?
                    <CloseRoundedIcon style={{marginLeft:'-1em'}} /> : undefined }</div>
                </Tooltip>
                  </div> */}
          <Tooltip placement="top" title={t('ctCopyToClipboard')} >
            <div className={classes.titleButton} onClick={onClickCopy}
              onTouchStart={stop}>
                <Icon icon={clipboardCopy} height={TITLE_HEIGHT}/>
            </div>
          </Tooltip>
          {isContentMaximizable(props.content) ?
            <Tooltip placement="top" title={zoomed ? t('ctUnMaximize') : t('ctMaximize')} >
              <div className={classes.titleButton} onClick={onClickMaximize}
                onTouchStart={stop}>
                  <Icon icon={zoomed ? minimizeIcon: maximizeIcon} height={TITLE_HEIGHT}/>
              </div>
            </Tooltip> : undefined}
          <div className={classes.titleButton} onClick={onClickMore} onTouchStart={stop} ref={formRef}>
              <MoreHorizIcon />
          </div>
          <SharedContentForm open={showForm} {...props} close={onCloseForm}
            anchorEl={contentRef.current} anchorOrigin={{vertical:'top', horizontal:'right'}}
          />
          <div className={classes.note} onClick={onClickShare} onTouchStart={stop}>Share</div>
          {props.content.playback ? <div className={classes.close} ><PlayArrowIcon htmlColor="#0C0" /></div> :
            props.content.pinned ? undefined :
              <div className={classes.close} onClick={onClickClose} onTouchStart={stop}>
                <CloseRoundedIcon /></div>}
        </div>
      </div>
      <div className={classes.content} ref={contentRef}
        onFocus={()=>{
          if (doseContentEditingUseKeyinput(props.content) && editing){
            map.keyInputUsers.add(props.content.id)
          }
        }}
        onBlur={()=>{
          if (doseContentEditingUseKeyinput(props.content) && editing){
            map.keyInputUsers.delete(props.content.id)
          }
        }}
      >
        <Content {...props}/>
      </div>
    </div>
  //  console.log('Rnd rendered.')


  return (
    <div className={classes.container} style={{zIndex:props.content.zIndex}} onContextMenu={
      (evt) => {
        evt.stopPropagation()
        evt.preventDefault()
      }
    }>
      <Rnd className={classes.rndCls} enableResizing={isFixed ? resizeDisable : resizeEnable}
        disableDragging={isFixed} ref={rnd}
        onResizeStart = {onResizeStart}
        onResize = {onResize}
        onResizeStop = {onResizeStop}
      >
        {theContent}
      </Rnd>
    </div >
  )
}

const buttonStyle = {
  '&:hover': {
    backgroundColor: 'rosybrown',
  },
  '&:active': {
    backgroundColor: 'firebrick',
  },
}

const BORDER_WIDTH = 3

const useStyles = makeStyles({
  container: (props: StyleProps) => {
    const mat = new DOMMatrix()
    mat.rotateSelf(0, 0, props.pose.orientation)

    return ({
      display: props.props.hideAll ? 'none' : 'block',
      width:0,
      height:0,
      transform: mat.toString(),
      position: 'absolute',
    })
  },
  rndCls: (props: StyleProps) => ({
    borderRadius: props.showTitle ? '0.5em 0.5em 0 0' : '0 0 0 0',
    backgroundColor: props.props.content.noFrame ? 'rgba(0,0,0,0)' :
      settings.useTransparent ? 'rgba(200,200,200,0.5)' : 'rgba(200,200,200,1)',
    boxShadow: props.props.content.noFrame ? undefined :
      settings.useTransparent ? '0.2em 0.2em 0.2em 0.2em rgba(0,0,0,0.4)' :
        '0.2em 0.2em 0.2em 0.2em rgba(100,100,100,1)',
  }),
  rndContainer: (props: StyleProps) => ({
    width:'100%',
    height:'100%',
  }),
  titlePosition: (props:StyleProps) => (
    props.showTitle ?
    {}
    :
    {
      width:0,
      heihgt:0,
      position:'absolute',
      top:0,
    }
  ),
  titleContainer: (props:StyleProps) => {
    const rv:CreateCSSProperties = {
      display:'flex',
      width: props.size[0],
      overflow: 'hidden',
      userSelect: 'none',
      userDrag: 'none',
    }
    if (!props.showTitle) {
      rv['position'] = 'absolute'
      rv['bottom'] = 0
    }

    return rv
  },
  content: (props: StyleProps) => ({
    position: 'absolute',
    top: (props.showTitle ? TITLE_HEIGHT : 0) - (props.editing ? BORDER_WIDTH : 0),
    left: props.editing ? -BORDER_WIDTH : 0,
    width: props.size[0],
    height: props.size[1],
    userDrag: 'none',
    pointerEvents: props.dragging ? 'none' : 'auto',
    borderWidth: BORDER_WIDTH,
    borderColor: 'yellow',
    borderStyle: props.editing ? 'solid' : 'none',
    cursor: props.editing ? 'default' : undefined,
    opacity: props.props.content.opacity,
  }),
  note: (props:StyleProps) => (
    props.showTitle ? {
      visibility: props.props.onShare ? 'visible' : 'hidden',
      whiteSpace: 'pre',
      borderRadius: '0.5em 0 0 0',
      ...buttonStyle,
    } : {
      visibility: 'hidden',
    }),
  pin: (props:StyleProps) => (
    props.showTitle ? {
      display: props.props.onShare ? 'none' : 'block',
      height: TITLE_HEIGHT,
      whiteSpace: 'pre',
      cursor: 'default',
      ...buttonStyle,
    } : {display:'none'}
  ),
  titleButton: (props:StyleProps) => (
    props.showTitle ? {
      display: 'block',
      height: TITLE_HEIGHT,
      whiteSpace: 'pre',
      cursor: 'default',
      ...buttonStyle,
    } : {display:'none'}
  ),
  edit: (props:StyleProps) => (
    props.showTitle ? {
      display: (props.props.onShare || !isContentEditable(props.props.content)) ? 'none' : 'block',
      height: TITLE_HEIGHT,
      whiteSpace: 'pre',
      cursor: 'default',
      ...buttonStyle,
    } : {display:'none'}
  ),
  type: (props: StyleProps) => ({
    display: props.showTitle ? 'block' : 'none',
    height: TITLE_HEIGHT,
  }),
  close: (props: StyleProps) => ({
    visibility: props.showTitle ? 'visible' : 'hidden',
    position:'absolute',
    right:0,
    margin:0,
    padding:0,
    height: TITLE_HEIGHT,
    borderRadius: '0 0.5em 0 0',
    cursor: 'default',
    ...buttonStyle,
  }),
})

const resizeEnable = {
  bottom: true,
  bottomLeft: true,
  bottomRight: true,
  left: true,
  right: true,
  top: true,
  topLeft: true,
  topRight:true,
}
const resizeDisable = {
  bottom: false,
  bottomLeft: false,
  bottomRight: false,
  left: false,
  right: false,
  top: false,
  topLeft: false,
  topRight:false,
}

RndContent.displayName = 'RndContent'
