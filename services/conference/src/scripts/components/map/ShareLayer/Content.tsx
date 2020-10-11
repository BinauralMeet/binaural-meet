import content from '*.svg'
import {makeStyles} from '@material-ui/core/styles'
import {SharedContent as ISharedContent} from '@models/SharedContent'
import {param} from 'jquery'
import {split} from 'lodash'
import React, {useEffect, useMemo, useRef} from 'react'
import {Abs} from 'tone'
import YouTubePlayer from 'yt-player'

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
  content:ISharedContent
}
class ContentState{
  ytPlayer?:YouTubePlayer
}
export function paramArray2map(paramArray: string[]):Map<string, string|undefined> {
  return new Map<string, string|undefined>(
    paramArray.map(param => param.split('=') as [string, string]))
}
export function paramStr2map(paramStr: string):Map<string, string|undefined> {
  const paramArray = paramStr.split('&')

  return paramArray2map(paramArray)
}
export function paramMap2Str(params:Map<string, string|undefined>) {
  let str = ''
  let sep = ''
  for (const param of params) {
    str += `${sep}${param[0]}=${param[1]}`
    sep = '&'
  }

  return str
}

export const Content: React.FC<ContentProps> = (props:ContentProps) => {
  const classes = useStyles()
  const state = useRef<ContentState>(new ContentState())
  if (props.content.type === 'youtube' && state.current.ytPlayer) {
    const params = paramStr2map(props.content.url)
    if (params.has('start')) {

    }else {

    }
  }


  useEffect(
    () => {
      if (props.content.type === 'youtube' && props.content.id) {
        if (!state.current.ytPlayer) {
          const id = `#YT${props.content.id}`
          console.log(id)
          state.current.ytPlayer = new YouTubePlayer(id, {autoplay:true})
          state.current.ytPlayer.on('error', (err) => console.log('YT error ', err))
          state.current.ytPlayer.on('unstarted', () => console.log('YT unstarted'))
          state.current.ytPlayer.on('ended', () => console.log('YT ended'))
          state.current.ytPlayer.on('playing', () => console.log('YT playing'))
          state.current.ytPlayer.on('paused', () => console.log('YT paused'))
          state.current.ytPlayer.on('buffering', () => console.log('YT buffering'))
          state.current.ytPlayer.on('cued', () => console.log('YT cued'))
          console.log('YTPlayer created')
        }
        const player = state.current.ytPlayer
        const params = paramStr2map(props.content.url)
        if (player) {
          if (params.has('list')) {
            player.loadList({
              listType:'playlist',
              list:params.get('list') as string,
            })
          }else if (params.has('v')) {
            player.load(params.get('v') as string)
          }
        }
        /*
        player.on('playing', () => {
          const elasp = player.getCurrentTime()
          const real = elasp / player.getPlaybackRate()
          // tslint:disable-next-line: no-magic-numbers
          const start = Date.now() - real * 1000
          const params = paramStr2map(props.content.url)
          if (params.has('start')){
            const diff = Number(params.get('start')) - start
            if (Abs(diff > ))
          }
        }
        player.on('cued', () => {
          const now = Date()
          player.play()
        })
*/
      }else {
        if (state.current.ytPlayer) {
          state.current.ytPlayer.destroy()
        }
        state.current.ytPlayer = undefined
      }

    },    [props.content.type, props.content.id],
  )

//  return useMemo(() => {
  let rv
  if (props.content.type === 'img') {
    rv = <img className={classes.img} src={props.content.url} />
  }else if (props.content.type === 'iframe') {
    rv = <iframe className={classes.iframe} />
  }else if (props.content.type === 'youtube') {
    const params = new Map<string, string>(
        props.content.url.split('&').map(str => str.split('=') as [string, string]))
    let url
    if (params.has('list')) {
      url = `https://www.youtube.com/embed?listType=playlist&list=${params.get('list')}`
    }else if (params.has('v')) {
      url = `https://www.youtube.com/embed/${params.get('v')}`
    }else {
      console.error('URL to youtube does not have v= or list=')
    }
    console.log(`div id = YT${props.content.id}`)
    rv = <div id={`YT${props.content.id}`} className={classes.iframe} />
  }else if (props.content.type === 'text') {
    rv =  <div className={classes.text} >{props.content.url}</div>
  }else {
    rv = <div className={classes.text} >Unknow type:{props.content.type} for {props.content.url}</div>
  }
    //  console.log(`useMemo rerender for ${props.url}`)

  return rv
//  },             [props.content.url, props.content.type, props.content.id])
}
