import {makeStyles} from '@material-ui/core/styles'
import {SharedContent as ISharedContent} from '@models/SharedContent'
import {SharedContent as SharedContentStore} from '@stores/SharedContent'
import {SharedContents as SharedContentsStore} from '@stores/SharedContents'
import {useObserver} from 'mobx-react-lite'
import React, {useEffect, useRef} from 'react'
import {Rnd} from 'react-rnd'
import {Content} from './Content'


const useStyles = makeStyles({
  rnd: (props: ISharedContent) => ({
    display: props.type === '' ? 'none' : 'block',
    boxShadow: '0.2em 0.2em 0.2em 0.2em rgba(0,0,0,0.2)',
//    transform:'rotate(' + props.pose.orientation + 'deg)',
    backgroundColor: 'rgba(0,0,0,0.1)',
  }),
})

export const SharedContent: React.FC<any> = (props) => {
  const content = props.content as SharedContentStore
  const contents = props.contents as SharedContentsStore
  const rndProps = useObserver(() => content)
  const rnd = useRef<Rnd>(null)

  const classes = useStyles(content)
  console.log('render:', content.pose.position)
  useEffect(() => {
    console.log('updatePosition and Size')
    rnd.current?.updatePosition({x:content.pose.position[0], y:content.pose.position[1]})
    rnd.current?.updateSize({width:content.size[0], height:content.size[1]})
  })

  return (
    <Rnd
      className={classes.rnd}
      ref={rnd}
      onDrag = {
        (evt) => {
          evt.stopPropagation(); evt.preventDefault()
        }
      }
      onDragStop = {
        (e, data) => {
          content.pose.position = [data.x, data.y]
          contents.sendOrder()
        }
      }
      onResize = {
        (evt) => {
          evt.stopPropagation()
          evt.preventDefault()
        }
      }
      onResizeStop = {
        (e, dir, elem, delta, pos) => {
          content.size = [elem.clientWidth, elem.clientHeight]
          contents.sendOrder()
        }
      }
  >
    <Content content={rndProps} />
  </Rnd>
  )
}
