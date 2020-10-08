import {makeStyles} from '@material-ui/core/styles'
import React, {useMemo} from 'react'

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

interface ContentProps{
  type: string
  url: string
}

export const Content: React.FC<ContentProps> = (props:ContentProps) => {
  const classes = useStyles()
  //  console.log(`rerender content for ${props.url}`)

  return useMemo(() => {
    let rv
    if (props.type === 'img') {
      rv = <img className={classes.img} src={props.url} />
    }else if (props.type === 'iframe' || props.type === 'youtube') {
      rv = <iframe className={classes.iframe} src={props.url} />
    }else if (props.type === 'text') {
      rv =  <div className={classes.text} >{props.url}</div>
    }else {
      rv = <div className={classes.text} >Unknow type:{props.type} for {props.url}</div>
    }
    //  console.log(`useMemo rerender for ${props.url}`)

    return rv
  },             [props.url, props.type])
}
