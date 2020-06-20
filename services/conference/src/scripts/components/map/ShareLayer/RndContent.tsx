import {makeStyles} from '@material-ui/core/styles'
import {CreateCSSProperties} from '@material-ui/core/styles/withStyles'
import CloseRoundedIcon from '@material-ui/icons/CloseRounded'
import {SharedContent as ISharedContent} from '@models/SharedContent'
import {Pose2DMap} from '@stores/SharedContent'
import React, {useEffect, useRef, useState} from 'react'
import {Dimensions, useDimensions} from 'react-dimensions-hook'
import {Rnd} from 'react-rnd'
import {addV, subV, useGesture} from 'react-use-gesture'
import {Content} from './Content'

export interface RndContentProps{
  content: ISharedContent
  hideAll?: boolean
  autoHideTitle?: boolean
  onShare?: (evt: React.MouseEvent<HTMLDivElement>) => void
  onClose?: (evt: React.MouseEvent<HTMLDivElement>) => void
  onPaste?: (evt: ClipboardEvent) => void
  onUpdate?: (newContent: ISharedContent) => void
}
interface StyleProps{
  props: RndContentProps,
  pose: Pose2DMap,
  size: [number, number],
  dimensions: Dimensions,
  showTitle: boolean,
}

export const RndContent: React.FC<RndContentProps> = (props:RndContentProps) => {
  const [pose, setPose] = useState(props.content.pose)
  const [size, setSize] = useState(props.content.size)
  const {ref, dimensions} = useDimensions()
  const [showTitle, setShowTitle] = useState(!props.autoHideTitle)
  const [content, setContent] = useState(props.content)
  useEffect(
    () => {
      if (content !== props.content) {
        setPose(props.content.pose)
        setSize(props.content.size)
        setContent(props.content)
      }
    },
  )
  useEffect(
    () => {
      const titleHeight = showTitle ? dimensions.height : 0
      rnd.current?.updatePosition({x:pose.position[0], y:pose.position[1] - titleHeight})
      rnd.current?.updateSize({width:size[0], height:size[1] + titleHeight})
      //  if (rnd.curr {ent) console.log('update pose and size:', pose, s }ize)
    },
    [pose, size, showTitle, dimensions],
  )

  function onClickShare(evt: React.MouseEvent<HTMLDivElement>) { props.onShare?.call(null, evt) }
  function onClickClose(evt: React.MouseEvent<HTMLDivElement>) { props.onClose?.call(null, evt) }
  function onPaste(evt: ClipboardEvent) { props.onPaste?.call(null, evt) }
  const updateHandler = () => {
    const newContent = Object.assign({}, props.content)
    newContent.pose = pose
    newContent.size = size
    // console.log('onUpdate', newContent)
    props.onUpdate?.call(null, newContent)
  }
  const [preciseOrientation, setPreciseOrientation] = useState(pose.orientation)
  function dragHandler(delta:[number, number], buttons:number, event:any) {
    if (buttons === 2) {
      setPreciseOrientation((preciseOrientation + delta[0] + delta[1]) % 360)
      if (event?.shiftKey || event?.ctrlKey) {
        pose.orientation = preciseOrientation
      }else {
        pose.orientation = preciseOrientation - preciseOrientation % 15
      }
      setPose(Object.assign({}, pose))
    }else {
      for (let i = 0; i < 2; i += 1) { pose.position[i] += delta[i] }
      setPose(Object.assign({}, pose))
    }
  }
  const bindTitle = useGesture({
    onDrag: ({down, delta, event, xy, buttons}) => {
      // console.log('onDragTitle:', delta)
      if (down) {
        event?.stopPropagation()
        //  event?.preventDefault()
        dragHandler(delta, buttons, event)
      }else {
        updateHandler()
      }
    },
  })
  useEffect(
    () => {
      window.document.body.addEventListener(
        'paste',
        (event) => {
          onPaste(event)
          event.preventDefault()
        },
      )
    },
    [],
  )
  const rnd = useRef<Rnd>(null)
  const classes = useStyles({props, pose, size, dimensions, showTitle})
  //  console.log('render: dimensions.height:', dimensions.height)

  return (
    <div className={classes.container} onContextMenu={
      (evt) => {
        evt.stopPropagation()
        evt.preventDefault()
      }
    }>
      <Rnd className={classes.rndCls} ref={rnd}
        onDrag = { (evt, data) => {
          evt.stopPropagation()
          evt.preventDefault()
          dragHandler([data.deltaX, data.deltaY], (evt as any).buttons, evt)
        } }
        onDragStop = { (e, data) => {
          setPose(Object.assign({}, pose))
          updateHandler()
        } }
        onResize = { (evt, dir, elem, delta, pos) => {
          // console.log('resize: ', dir, delta, pos)
          evt.stopPropagation(); evt.preventDefault()
          const titleHeight = showTitle ? dimensions.height : 0
          const newSize:[number, number] = [elem.clientWidth, elem.clientHeight - titleHeight]
          let posChange = false
          if (dir === 'left' || dir === 'topLeft' || dir === 'bottomLeft') {
            pose.position[0] -= newSize[0] - size[0]
            posChange = posChange || (newSize[0] !== size[0])
          }
          if (dir === 'top' || dir === 'topLeft' || dir === 'topRight') {
            pose.position[1] -= newSize[1] - size[1]
            posChange = posChange || (newSize[1] !== size[1])
          }
          if (posChange) {
            setPose(Object.assign({}, pose))
          }
          setSize(newSize)
        } }
        onResizeStop = { (e, dir, elem, delta, pos) => {
          const titleHeight = showTitle ? dimensions.height : 0
          setSize([elem.clientWidth, elem.clientHeight - titleHeight])
          updateHandler()
        } }
      >
        <div className={classes.titlePosition} >
          <div ref={ref} className={classes.titleContainer} {...bindTitle()}
            onMouseEnter = {() => { if (props.autoHideTitle) { setShowTitle(true) } }}
            onMouseLeave = {() => { if (props.autoHideTitle) { setShowTitle(false) } }}
            >
            <div className={classes.note} onClick={onClickShare}>Share</div>
            <div className={classes.close} onClick={onClickClose}><CloseRoundedIcon /></div>
          </div>
        </div>
        <div className={classes.content} ><Content content={props.content} /></div>
      </Rnd>
    </div >
  )
}

function mulV<S extends number, T extends number[]>(s: S, v2: T): T {
  return v2.map(v => s * v) as T
}

const useStyles = makeStyles({
  container: (props: StyleProps) => {
    const mat = new DOMMatrix()
    const titleHeight = props.showTitle ? props.dimensions.height : 0
    const size = [props.size[0], props.size[1] + titleHeight]
    mat.translateSelf(...addV(props.pose.position, mulV(0.5, size)))
    mat.rotateSelf(0, 0, props.pose.orientation)
    mat.translateSelf(...subV([0, 0], addV(props.pose.position, mulV(0.5, size))))

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
  content: (props: StyleProps) => ({
    width: '100%',
    height: props.size[1],
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
  close: (props: StyleProps) => ({
    visibility: props.showTitle ? 'visible' : 'hidden',
    position:'absolute',
    right:0,
    margin:0,
    padding:0,
    height: props.dimensions.height,
    borderRadius: '0 0.5em 0 0',
    cursor: 'default',
    '&:hover': {
      backgroundColor: 'firebrick',
    },
  }),
})
