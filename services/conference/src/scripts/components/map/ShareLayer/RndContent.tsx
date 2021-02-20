import {useStore as useContents} from '@hooks/SharedContentsStore'
import pinIcon from '@iconify/icons-mdi/pin'
import pinOffIcon from '@iconify/icons-mdi/pin-off'
import {Icon} from '@iconify/react'
import {makeStyles} from '@material-ui/core/styles'
import {CreateCSSProperties} from '@material-ui/core/styles/withStyles'
import DoneIcon from '@material-ui/icons/CheckCircle'
import CloseRoundedIcon from '@material-ui/icons/CloseRounded'
import EditIcon from '@material-ui/icons/Edit'
import FlipToBackIcon from '@material-ui/icons/FlipToBack'
import FlipToFrontIcon from '@material-ui/icons/FlipToFront'
import WallpaperIcon from '@material-ui/icons/Wallpaper'
import {Pose2DMap} from '@models/MapObject'
import {SharedContent as ISharedContent} from '@models/SharedContent'
import {addV2, mulV, rotateVector2DByDegree, subV2} from '@models/utils'
import mapData from '@stores/Map'
import {TEN_YEAR} from '@stores/sharedContents/SharedContentCreator'
import _ from 'lodash'
import React, {useLayoutEffect, useRef, useState} from 'react'
import {Rnd} from 'react-rnd'
import {useGesture} from 'react-use-gesture'
import {Content, contentTypeIcons} from './Content'

interface RndContentProps {
  content: ISharedContent
  hideAll ?: boolean
  autoHideTitle ?: boolean
  editing: boolean
  onShare ?: (evt: React.MouseEvent<HTMLDivElement>) => void
  onClose ?: (evt: React.MouseEvent<HTMLDivElement>) => void
  onUpdate ?: (newContent: ISharedContent) => void
}
interface StyleProps{
  props: RndContentProps,
  pose: Pose2DMap,
  size: [number, number],
  showTitle: boolean,
  pinned: boolean,
}

class RndContentState{
  lastSize: [number, number] = [0, 0]
  lastPose: Pose2DMap = {orientation:0, position:[0, 0]}
}


//  -----------------------------------------------------------------------------------
//  The RnDContent component
export const TITLE_HEIGHT = 24
export const RndContent: React.FC<RndContentProps> = (props:RndContentProps) => {
  function rotateG2C(gv: [number, number]) {
    const lv = mapData.rotateFromWindow(gv)
    const cv = rotateVector2DByDegree(-pose.orientation, lv)
    //  console.log('rotateG2C called ori', pose.orientation, ' tran:', transform.rotation)

    return cv
  }
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
  const rnd = useRef<Rnd>(null)                         //  ref to rnd to update position and size
  const [showTitle, setShowTitle] = useState(!props.autoHideTitle || !props.content.pinned)
  const contents = useContents()
  function setEditing(flag: boolean) {
    if (flag) {
      contents.editingId = props.content.id
    }else if (contents.editingId === props.content.id) {
      contents.editingId = ''
    }
  }
  const state = useRef<RndContentState>(new RndContentState())

  if (!_.isEqual(props.content.size, state.current.lastSize)) {
    Object.assign(state.current.lastSize, props.content.size)
    setSize(props.content.size)
  }
  if (!_.isEqual(props.content.pose, state.current.lastPose)) {
    setPose(props.content.pose)
    state.current.lastPose = _.cloneDeep(props.content.pose)
  }

  useLayoutEffect(  //  reflect pose etc. to rnd size
    () => {
      if (rnd.current) { rnd.current.resizable.orientation = pose.orientation + mapData.rotation }
      const titleHeight = showTitle ? TITLE_HEIGHT : 0
      rnd.current?.updatePosition({x:pose.position[0], y:pose.position[1] - titleHeight})
      rnd.current?.updateSize({width:size[0], height:size[1] + titleHeight})
    },
    [pose, size, showTitle],
  )

  //  handlers
  function onClickShare(evt: React.MouseEvent<HTMLDivElement>) { props.onShare?.call(null, evt) }
  function onClickClose(evt: React.MouseEvent<HTMLDivElement>) { props.onClose?.call(null, evt) }
  function onClickMoveToTop(evt: React.MouseEvent<HTMLDivElement>) {
    props.content.moveToTop()
    const newContent = Object.assign({}, props.content)
    props.onUpdate?.call(null, newContent)
  }
  function onClickMoveToBottom(evt: React.MouseEvent<HTMLDivElement>) {
    props.content.moveToBottom()
    const newContent = Object.assign({}, props.content)
    props.onUpdate?.call(null, newContent)
  }
  function onClickWallpaper(evt: React.MouseEvent<HTMLDivElement>) {
    props.content.moveToBackground()
    const newContent = Object.assign({}, props.content)
    props.onUpdate?.call(null, newContent)
  }
  function onClickEdit(evt: React.MouseEvent<HTMLDivElement>) {
    setEditing(!props.editing)
  }
  function onClickPin(evt: React.MouseEvent<HTMLDivElement>) {
    updateHandler(!props.content.pinned)
  }
  function  updateHandler(pinned?:boolean) {
    let bChange = false
    if (! _.isEqual(pose, props.content.pose)) {
      bChange = true
    }
    if (! _.isEqual(size, props.content.size)) {
      bChange = true
    }
    if (pinned !== undefined &&  pinned !== props.content.pinned) {
      bChange = true
    }
    if (bChange) {
      const newContent = Object.assign({}, props.content)
      newContent.size = size
      newContent.pose = pose
      if (pinned !== undefined) {
        newContent.pinned = pinned
      }
      props.onUpdate?.call(null, newContent)
    }
  }
  //  drag for title area
  const [preciseOrientation, setPreciseOrientation] = useState(pose.orientation)
  function dragHandler(delta:[number, number], buttons:number, event:any) {
    const MOUSE_RIGHT = 2
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
      pose.position = addV2(pose.position, rotateG2C(delta))
      setPose(Object.assign({}, pose))
    }
  }

  const isFixed = (props.autoHideTitle && props.content.pinned) || props.editing
  const gesture = useGesture({
    onDrag: ({down, delta, event, xy, buttons}) => {
      // console.log('onDragTitle:', delta)
      if (isFixed) { return }
      event?.stopPropagation()
      if (down) {
        //  event?.preventDefault()
        dragHandler(delta, buttons, event)
      }else {
        updateHandler()
      }
    },
  },
  )
  function onResize(evt:MouseEvent | TouchEvent, dir: any, elem:HTMLDivElement, delta:any, pos:any) {
    evt.stopPropagation(); evt.preventDefault()
    const cd:[number, number] = [delta.width, delta.height]
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
    }
    const newSize = addV2(resizeBase, cd)
    if (props.content.originalSize[0]) {
      const ratio = props.content.originalSize[0] / props.content.originalSize[1]
      if (newSize[0] > ratio * newSize[1]) { newSize[0] = ratio * newSize[1] }
      if (newSize[0] < ratio * newSize[1]) { newSize[1] = newSize[0] / ratio }
    }
    setSize(newSize)
  }
  const classes = useStyles({props, pose, size, showTitle, pinned:props.content.pinned})
  //  console.log('render: TITLE_HEIGHT:', TITLE_HEIGHT)
  const theContent =
    <div className={classes.rndContainer} {...gesture()}>
      <div className={classes.titlePosition} {...gesture() /* title can be placed out of Rnd */}>
        <div className={classes.titleContainer}
            onPointerEnter = {() => { if (props.autoHideTitle) { setShowTitle(true) } }}
            onPointerLeave = {() => { if (props.autoHideTitle && props.content.pinned) { setShowTitle(false) } }}>
          <div className={classes.pin} onClick={onClickPin}>
            {contentTypeIcons(props.content.type, TITLE_HEIGHT)}
            <Icon icon={props.content.pinned ? pinIcon : pinOffIcon} height={TITLE_HEIGHT} />
          </div>
          <div className={classes.edit} onClick={onClickEdit}>
             {
              props.editing ? <DoneIcon style={{fontSize:TITLE_HEIGHT}} />
                : <EditIcon style={{fontSize:TITLE_HEIGHT}} />}
          </div>
          {props.content.pinned ? undefined :
            <div className={classes.titleButton} onClick={onClickMoveToTop}> <FlipToFrontIcon /></div>}
          {props.content.pinned ? undefined :
            <div className={classes.titleButton} onClick={onClickMoveToBottom}> <FlipToBackIcon /></div>}
          {(props.content.pinned || props.content.type !== 'img' || props.content.zorder < TEN_YEAR) ? undefined :
            <div className={classes.titleButton} onClick={onClickWallpaper}> <WallpaperIcon /></div>}
          <div className={classes.note} onClick={onClickShare}>Share</div>
          {props.content.pinned ? undefined :
             <div className={classes.close} onClick={onClickClose}><CloseRoundedIcon /></div>}
        </div>
      </div>
      <div className={classes.content} >
        <Content content={props.content} onUpdate={props.onUpdate} editing= {props.editing} setEditing={setEditing}  />
      </div>
    </div>
  //  console.log('Rnd rendered.')


  return (
    <div className={classes.container} onContextMenu={
      (evt) => {
        evt.stopPropagation()
        evt.preventDefault()
      }
    }>
      <Rnd className={classes.rndCls} enableResizing={isFixed ? resizeDisable : resizeEnable}
        disableDragging = {isFixed} ref={rnd}
        onResizeStart = { (evt)  => {
          evt.stopPropagation(); evt.preventDefault()
          setResizeBase(size)
          setResizeBasePos(pose.position)
        } }
        onResize = {onResize}
        onResizeStop = { (e, dir, elem, delta, pos) => {
          onResize(e, dir, elem, delta, pos)
          updateHandler()
        } }
      >
        {theContent}
      </Rnd>
    </div >
  )
}

const useStyles = makeStyles({
  container: (props: StyleProps) => {
    const mat = new DOMMatrix()
    const size = [props.size[0], props.size[1]]
    mat.rotateSelf(0, 0, props.pose.orientation)

    return ({
      display: props.props.hideAll ? 'none' : 'block',
      width:0,
      height:0,
      transform: mat.toString(),
    })
  },
  rndCls: (props: StyleProps) => ({
    borderRadius: props.showTitle ? '0.5em 0.5em 0 0' : '0 0 0 0',
    backgroundColor: 'rgba(200,200,200,0.5)',
    boxShadow: '0.2em 0.2em 0.2em 0.2em rgba(0,0,0,0.4)',
  }),
  rndContainer: (props: StyleProps) => ({
    width:'100%',
    height:'100%',
  }),
  content: (props: StyleProps) => ({
    width: props.size[0],
    height: props.size[1],
    userDrag: 'none',
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
  note: (props:StyleProps) => (
    props.showTitle ? {
      visibility: props.props.onShare ? 'visible' : 'hidden',
      whiteSpace: 'pre',
      borderRadius: '0.5em 0 0 0',
      '&:hover': {
        backgroundColor: 'firebrick',
      },
    } : {
      visibility: 'hidden',
    }),
  pin: (props:StyleProps) => (
    props.showTitle ? {
      display: props.props.onShare ? 'none' : 'block',
      height: TITLE_HEIGHT,
      whiteSpace: 'pre',
      borderRadius: '0.5em 0 0 0',
      cursor: 'default',
      '&:hover': {
        backgroundColor: 'firebrick',
      },
    } : {display:'none'}
  ),
  titleButton: (props:StyleProps) => (
    props.showTitle ? {
      display: 'block',
      height: TITLE_HEIGHT,
      whiteSpace: 'pre',
      cursor: 'default',
      '&:hover': {
        backgroundColor: 'firebrick',
      },
    } : {display:'none'}
  ),
  edit: (props:StyleProps) => (
    props.showTitle ? {
      display: (props.props.onShare || !props.props.content.isEditable()) ? 'none' : 'block',
      height: TITLE_HEIGHT,
      whiteSpace: 'pre',
      cursor: 'default',
      '&:hover': {
        backgroundColor: 'firebrick',
      },
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
    '&:hover': {
      backgroundColor: 'firebrick',
    },
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
