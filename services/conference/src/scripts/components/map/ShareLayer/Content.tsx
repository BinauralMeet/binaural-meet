import {makeStyles} from '@material-ui/core/styles'
import {IFRAME_TYPE, IMG_TYPE, TEXT_TYPE, VIDEO_TYPE} from '@models/sharedContent'
import {SharedContent} from '@stores/sharedContents/SharedContent'
import{useObserver} from 'mobx-react-lite'
import React from 'react'

const useStyles = makeStyles({
  img: {
    width: '100%',
    height: '100%',
    verticalAlign: 'bottom',
  },
  iframe: {
    width: '100%',
    height: '100%',
  },
  text: {
    overflow: 'hidden',
  },
})

interface ContentProps {
  content: SharedContent
}

export const Content: React.FC<any> = (props) => {
  const {
    content,
  } = props

  const classes = useStyles()
  if (content.type === IMG_TYPE) {
    return useObserver(() => <img className={classes.img} src={content.url} />)
  }

  if (content.type === IFRAME_TYPE) {
    return useObserver(() => <iframe className={classes.iframe} src={content.url} />)
  }

  if (content.type === TEXT_TYPE) {
    return useObserver(() => <div className={classes.text} >{content.text}</div>)
  }

  if (content.type === VIDEO_TYPE) {
    // TODO add support for video type
    throw new Error('Share video not implemented')

    return useObserver(() => <div />)
  }

  return <div className={classes.text} >Unknow type:{content.type}</div>
}
