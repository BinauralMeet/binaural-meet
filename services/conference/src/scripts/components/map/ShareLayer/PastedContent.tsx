import {makeStyles} from '@material-ui/core/styles'
import {SharedContent as ISharedContent} from '@models/SharedContent'
import {default as participants} from '@stores/Participants'
import {SharedContent, Pose2DMap} from '@stores/SharedContent'
import React, {useEffect, useRef, useState} from 'react'
import {Rnd} from 'react-rnd'
import {Content} from './Content'
import CloseRoundedIcon from '@material-ui/icons/CloseRounded'
import {useDimensions, Dimensions} from 'react-dimensions-hook';
import {useGesture} from 'react-use-gesture'


(global as any).mousePositionOnMap = [0, 0]
let preciseOrientation = 0

interface StyleProps{
  content: ISharedContent,
  pose: Pose2DMap,
  totalSize: [number, number],
  dimensions: Dimensions
}

const useStyles = makeStyles({
  container: (props: StyleProps) => ({
    display: props.content.type === '' ? 'none' : 'block',
    transform:'rotate(' + props.pose.orientation + 'deg)',
  }),
  rnd: (props: StyleProps) => ({
    borderRadius: '0.5em 0.5em 0 0',
    backgroundColor: 'rgba(200,200,200,0.5)',
    boxShadow: '0.2em 0.2em 0.2em 0.2em rgba(0,0,0,0.4)',
  }),
  content: (props: StyleProps) => ({
    width: '100%',
    height: props.totalSize[1] - props.dimensions.height,
  }),
  titleContainer: {
    display:'flex',
    width:'100%',
    overflow: 'hidden',
    userSelect: 'none',
    userDrag: 'none',
    cursor: 'move',
  },
  note:{
    whiteSpace: 'pre',
    borderRadius: '0.5em 0 0 0',
    '&:hover': {
      backgroundColor: 'firebrick',
    },
  },
  close: (props: StyleProps) => ({
    position:'absolute',
    right:0,
    margin:0,
    padding:0,
    height:props.dimensions.height,
    borderRadius: '0 0.5em 0 0',
    cursor: 'default',
    '&:hover': {
      backgroundColor: 'firebrick',
    }
  })
})

export const PastedContent: React.FC<any> = (props:any) => {
  const nullContent = {
    type:'', url:'',
    pose:{position:[0, 0], orientation:0},
    size: [0, 0],
  } as ISharedContent
  const defContent: ISharedContent = props.content ? props.content : nullContent
  const [content, setContent] = useState(defContent)
  const [pose, setPose] = useState(content.pose)
  const [totalSize, setTotalSize] = useState(content.size)

  function onClick(evt: React.MouseEvent<HTMLInputElement>) {
    // console.log("onClick b:", evt.button, " bs:" ,evt.buttons, " d:", evt.detail, " p:", evt.eventPhase)
    //  Add the pasted content to localPaticipant's contents and remove it.
    participants.local.get().addContent(Object.assign(new SharedContent(), content))
    setContent(nullContent)
  }
  function onClickClose(evt: React.MouseEvent<HTMLDivElement>){
    setContent(nullContent)
    evt.stopPropagation()
  }
  const bindTitle = useGesture({
    onDrag: ({down, delta, event, xy, buttons}) => {
      //console.log('onDragTitle:', delta)
      if (down){
        event?.stopPropagation()
        if (buttons === 2) {
          preciseOrientation += delta[0] + delta[1];
          preciseOrientation %= 360;
          if (event?.shiftKey || event?.ctrlKey){
            pose.orientation = preciseOrientation;
          }else{
            pose.orientation = preciseOrientation - preciseOrientation % 15;
          }
          setPose(Object.assign({}, pose))
        }else{
          for(let i=0; i<2; ++i) pose.position[i] += delta[i]
          setPose(Object.assign({}, pose))
        }
      }else{
        content.pose = pose
        setContent(Object.assign({}, content))
      }
    }
  })
  function onPaste(evt: ClipboardEvent) {
    // console.log("onPaste called")
    if (evt.clipboardData) {
      if (evt.clipboardData.types.includes('Files')) {   //  If file is pasted (an image is also a file)
        const imageFile = evt.clipboardData.items[0].getAsFile()
        if (imageFile) {
          //  upload image file to Gayzo
          const formData = new FormData()
          formData.append('access_token', 'e9889a51fca19f2712ec046016b7ec0808953103e32cd327b91f11bfddaa8533')
          formData.append('imagedata', imageFile)
          fetch('https://upload.gyazo.com/api/upload', {method: 'POST', body: formData})
          .then((response) => response.json())
          .then((responseJson) => {
            // console.log("URL = " + responseJson.url)
            //  To do, add URL and ask user position to place the image
            const img = new Image()
            img.src = responseJson.url
            img.onload = () => {
              content.size = [img.width, img.height]
              // console.log("mousePos:" + (global as any).mousePositionOnMap)
              content.pose.position = (global as any).mousePositionOnMap
              for (let i = 0; i < 2; ++i) { content.pose.position[i] -= content.size[i] / 2 }
              content.url = responseJson.url
              content.type = 'img'
              preciseOrientation = content.pose.orientation
              setContent(Object.assign({}, content))
            }
          })
          .catch((error) => {
            console.error(error)
          })
        }
      }else if (evt.clipboardData.types.includes('text/plain')) {
        evt.clipboardData.items[0].getAsString((str:string) => {
          content.url = str
          if (content.url.indexOf('http://') === 0 || content.url.indexOf('https://') === 0) {
            content.type = 'iframe'
            content.size[0] = 600
            content.size[1] = 800
          }else {
            content.type = 'text'
            content.pose.position = (global as any).mousePositionOnMap
            const slen = Math.sqrt(str.length)
            content.size[0] = slen * 14 * 2
            content.size[1] = slen * 14 / 2
          }
          setContent(Object.assign({}, content))
        })
      }
    }
  }
  useEffect(
    () => {
//      bind()
      window.document.body.addEventListener(
        'paste',
        (event) => {
          onPaste(event)
          event.preventDefault()
        },
      )
    },
    [
    //  bind
    ],
  )
  const rnd = useRef<Rnd>(null)
  const {ref, dimensions} = useDimensions()
  const classes = useStyles({content, totalSize, pose, dimensions})
  useEffect(() => {
    setPose(content.pose)
  },
  [content])
  useEffect(() => {
    rnd.current?.updatePosition({x:pose.position[0], y:pose.position[1]})
    rnd.current?.updateSize({width:totalSize[0], height:totalSize[1]})
  },
  [pose, totalSize])

  return (
    <div className={classes.container} >
    <Rnd className={classes.rnd} ref={rnd}
      onDrag = { (evt, data) => {
        evt.stopPropagation()
        evt.preventDefault()
        pose.position = [data.x, data.y]
        setPose(Object.assign({}, pose))
      } }
      onDragStop = { (e, data) => {
        pose.position = [data.x, data.y]
        content.pose = pose;
        setPose(Object.assign({}, pose))
      } }
      onResize = { (evt, dir, elem, delta, pos) => {
        evt.stopPropagation(); evt.preventDefault()
        setTotalSize([elem.clientWidth, elem.clientHeight])
      } }
      onResizeStop = { (e, dir, elem, delta, pos) => {
        setTotalSize([elem.clientWidth, elem.clientHeight])
        content.size = [elem.clientWidth, elem.clientHeight - dimensions.height]
        setContent(Object.assign({}, content))
      } }
    >
      <div className={classes.titleContainer} {...bindTitle()} ref={ref}>
        <div className={classes.note} onClick = {onClick}>Share</div>
        <div className={classes.close} onClick={onClickClose}><CloseRoundedIcon/></div>
      </div>
      <div className={classes.content} ><Content content={content} /></div>
    </Rnd>
  </div>
  )
}
