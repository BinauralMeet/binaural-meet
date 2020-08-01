import {makeStyles} from '@material-ui/core/styles'
import {SharedContent as ISharedContent} from '@models/SharedContent'
import React from 'react'

const useStyles = makeStyles({
  img: {
    width: '100%',
    height: '100%',
    verticalAlign: 'bottom',
    userDrag: 'none',
  },
  iframe: {
    width: '100%',
    height: '100%',
  },
  text: {
    overflow: 'hidden',
  },
})

export const Content: React.FC<any> = (props) => {
  const content = props.content as ISharedContent
  const classes = useStyles()
  if (content.type === 'img') {
    return <img className={classes.img} src={content.url} />
  } if (content.type === 'iframe') {
    return <iframe className={classes.iframe} src={content.url} />
  } if (content.type === 'text') {
    return <div className={classes.text} >{content.url}</div>
  }

  return <div className={classes.text} >Unknow type:{content.type} for {content.url}</div>

}
