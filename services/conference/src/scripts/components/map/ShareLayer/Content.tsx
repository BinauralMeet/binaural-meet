import {makeStyles} from '@material-ui/core/styles'
import React, {useRef, useEffect, useState} from 'react'
import {SharedContent as ISharedContent} from '@models/SharedContent'

const useStyles = makeStyles({
  img: (props: ISharedContent) => ({
    width: props.size[0],
    height: props.size[1],
    verticalAlign: 'bottom',
  }),
  text: (props: ISharedContent) => ({
    width: props.size[0]
  }),
})

export const Content: React.FC<any> = (props) => {
  const content = props.content as ISharedContent
  const classes = useStyles(content)
  if (content.type == 'img'){
    return <img className={classes.img} src={content.url} />
  }else{
    return <div className={classes.text} >{content.url}</div>
  }
}
