import pinIcon from '@iconify/icons-mdi/pin'
import pinOffIcon from '@iconify/icons-mdi/pin-off'
import {Icon} from '@iconify/react'
import {makeStyles} from '@material-ui/core/styles'
import {CreateCSSProperties} from '@material-ui/core/styles/withStyles'
import CloseRoundedIcon from '@material-ui/icons/CloseRounded'
import {Pose2DMap} from '@models/MapObject'
import {SharedContent as ISharedContent} from '@models/SharedContent'
import {rotateVector2DByDegree} from '@models/utils'
import _ from 'lodash'
import React, {useLayoutEffect, useRef, useState} from 'react'
import {Dimensions, useDimensions} from 'react-dimensions-hook'
import {Rnd} from 'react-rnd'
import {addV, subV, useGesture} from 'react-use-gesture'
import {useValue as useTransform} from '../utils/useTransform'
import {Content} from './Content'

function mulV<S extends number, T extends number[]>(s: S, v2: T): T {
  return v2.map(v => s * v) as T
}

export interface RndContentProps{
  content: ISharedContent
  hideAll?: boolean
  autoHideTitle?: boolean
  onShare?: (evt: React.MouseEvent<HTMLDivElement>) => void
  onClose?: (evt: React.MouseEvent<HTMLDivElement>) => void
  onUpdate?: (newContent: ISharedContent) => void
}
interface StyleProps{
  props: RndContentProps,
  pose: Pose2DMap,
  size: [number, number],
  dimensions: Dimensions,
  showTitle: boolean,
  pinned: boolean,
}

class RndContentState{
  lastSize: [number, number] = [0, 0]
  lastPose: Pose2DMap = {orientation:0, position:[0, 0]}
}

//  -----------------------------------------------------------------------------------
//  The RnDContent component
export const RndContent: React.FC<RndContentProps> = (props:RndContentProps) => {
  const transform = useTransform()
  function rotateG2C(gv: [number, number]) {
    const lv = transform.rotateG2L(gv)
    const cv = rotateVector2DByDegree(-pose.orientation, lv)
    //  console.log('rotateG2C called ori', pose.orientation, ' tran:', transform.rotation)

    return cv
  }
  function rotateG2L(gv: [number, number]) {
    const lv = transform.rotateG2L(gv)

    return lv
  }
  function rotateC2G(cv: [number, number]) {
    const lv = rotateVector2DByDegree(pose.orientation, cv)
    const gv = transform.rotateL2G(lv)

    return gv
  }

  // states
  const [pose, setPose] = useState(props.content.pose)  //  pose of content
  const [size, setSize] = useState(props.content.size)  //  size of content
  const [resizeBase, setResizeBase] = useState(size)    //  size when resize start
  const [resizeBasePos, setResizeBasePos] = useState(pose.position)    //  position when resize start
  const rnd = useRef<Rnd>(null)                         //  ref to rnd to update position and size
  const {ref, dimensions} = useDimensions()             //  title dimensions measured
  const [showTitle, setShowTitle] = useState(!props.autoHideTitle || !props.content.pinned)
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
      if (rnd.current) { rnd.current.resizable.orientation = pose.orientation + transform.rotation }
      const titleHeight = showTitle ? dimensions.clientHeight : 0
      rnd.current?.updatePosition({x:pose.position[0], y:pose.position[1] - titleHeight})
      rnd.current?.updateSize({width:size[0], height:size[1] + titleHeight})
      //  if (rnd.curr {ent) console.log('update pose and size:', pose, s }ize)
    },
    [pose, size, showTitle, dimensions],
  )

  //  handlers
  function onClickShare(evt: React.MouseEvent<HTMLDivElement>) { props.onShare?.call(null, evt) }
  function onClickClose(evt: React.MouseEvent<HTMLDivElement>) { props.onClose?.call(null, evt) }
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
      //    mat.translateSelf(...addV(props.pose.position, mulV(0.5, size)))
      const CENTER_IN_RATIO = 0.5
      const center = addV(pose.position, mulV(CENTER_IN_RATIO, size))
      pose.position = addV(pose.position,
                           subV(rotateVector2DByDegree(pose.orientation - newOri, center), center))
      pose.orientation = newOri
      setPose(Object.assign({}, pose))
    }else {
      pose.position = addV(pose.position, rotateG2C(delta))
      setPose(Object.assign({}, pose))
    }
  }

  const isFixed = props.autoHideTitle && props.content.pinned
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
      pose.position = addV(resizeBasePos, deltaPos)
      setPose(Object.assign({}, pose))
    }
    setSize(addV(resizeBase, cd))
  }
  const classes = useStyles({props, pose, size, dimensions, showTitle, pinned:props.content.pinned})
  //  console.log('render: dimensions.clientHeight:', dimensions.clientHeight)
  const theContent =
    <div className={classes.rndContainer} {...gesture()}>
      <div className={classes.titlePosition} {...gesture() /* title can be placed out of Rnd */}>
        <div ref={ref} className={classes.titleContainer}
            onMouseEnter = {() => { if (props.autoHideTitle) { setShowTitle(true) } }}
            onMouseLeave = {() => { if (props.autoHideTitle && props.content.pinned) { setShowTitle(false) } }}>
          <div className={classes.pin} onClick={onClickPin}>
            &nbsp;<Icon icon={props.content.pinned ? pinIcon : pinOffIcon} />&nbsp;
          </div>
          <div className={classes.note} onClick={onClickShare}>Share</div>
          <div className={classes.close} onClick={onClickClose}><CloseRoundedIcon /></div>
        </div>
      </div>
      <div className={classes.content} ><Content content={props.content} /></div>
    </div>
  const titleHeight = showTitle ? dimensions.clientHeight : 0
  //  console.log('Rnd rendered.')

  return (
    <div className={classes.container} onContextMenu={
      (evt) => {
        evt.stopPropagation()
        evt.preventDefault()
      }
    }>
      {isFixed ?
        <div className={classes.rndCls} style={{
          transform:`translate(${pose.position[0]}px, ${pose.position[1] - titleHeight}px)`,
          width:size[0], height:size[1] + titleHeight, display: 'inline-block', top: 0, left: 0,
          boxSizing: 'border-box', flexShrink: 0,
        }}>
          {theContent}
        </div> :
        <Rnd className={classes.rndCls} ref={rnd}
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
      }
    </div >
  )
}

const useStyles = makeStyles({
  container: (props: StyleProps) => {
    const mat = new DOMMatrix()
    const size = [props.size[0], props.size[1]]
//    mat.translateSelf(...addV(props.pose.position, mulV(0.5, size)))
    mat.rotateSelf(0, 0, props.pose.orientation)
//    mat.translateSelf(...subV([0, 0], addV(props.pose.position, mulV(0.5, size))))

    return ({
      display: props.props.hideAll ? 'none' : 'block',
      width:0,
      height:0,
      transform: mat.toString(),
      // transform: `rotate(${props.pose.orientation})`,
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
      whiteSpace: 'pre',
      borderRadius: '0.5em 0 0 0',
      cursor: 'default',
      '&:hover': {
        backgroundColor: 'firebrick',
      },
    } : {display:'none'}
  ),
  close: (props: StyleProps) => ({
    visibility: props.showTitle ? 'visible' : 'hidden',
    position:'absolute',
    right:0,
    margin:0,
    padding:0,
    height: props.dimensions.clientHeight,
    borderRadius: '0 0.5em 0 0',
    cursor: 'default',
    '&:hover': {
      backgroundColor: 'firebrick',
    },
  }),
})
