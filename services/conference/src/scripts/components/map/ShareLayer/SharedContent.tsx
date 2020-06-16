import {makeStyles} from '@material-ui/core/styles'
import React from 'react'
import {SharedContent as ISharedContent} from '@models/SharedContent'
import { Content } from './Content'
import { Rnd } from 'react-rnd';
import { ObservableMap } from 'mobx';
import {useObserver} from 'mobx-react-lite'


const useStyles = makeStyles({
  rnd: (props: ISharedContent) => ({
    display: props.type==''? 'none' : 'block',
    boxShadow: '0.2em 0.2em 0.2em 0.2em rgba(0,0,0,0.2)',
//    transform:'rotate(' + props.pose.orientation + 'deg)',
    backgroundColor: 'rgba(0,0,0,0.1)',
  }),
})

export const SharedContent: React.FC<any> = (props) => {

  const key = props.key as string
  const content = props.content as ISharedContent
  const order = props.order as ObservableMap<string, ISharedContent>
  const rndProps = useObserver(() => ({
    position: {x: content.pose.position[0], y: content.pose.position[0]},
    size: {width: content.size[0], height:content.size[1]}
  }))

  const classes = useStyles(content)
  return (
    <Rnd className={classes.rnd} {...rndProps}
    onDrag = { (evt)=>{ evt.stopPropagation() } }
    onDragStop = { (e, data) => {
      content.pose.position = [data.x, data.y]
    } }
    onResize = { (evt)=>{ evt.stopPropagation() } }
      onResizeStop = { (e,dir,elem, delta, pos) => {
      content.size[0] = elem.clientWidth
      content.size[1] = elem.clientHeight
    } }
  >
    <Content content={content} />
  </Rnd>
)
}
