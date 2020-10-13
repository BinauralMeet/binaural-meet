import {makeStyles} from '@material-ui/core/styles'
import {SharedContent as ISharedContent} from '@models/SharedContent'
import {useStore} from 'hooks/SharedContentsStore'
import React, {useEffect, useMemo, useRef} from 'react'
import YouTubePlayer from 'yt-player'

const CONTENTLOG = true
export const contentLog = CONTENTLOG ? console.log : (a:any) => {}

function getCurrentTimestamp() {
  const mil = 0.001

  return Date.now() * mil
}

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
  ytProhibitUntil = ''
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
function ytSeekAndPlay(start:number, state: ContentState) {
  const player = state.ytPlayer
  if (!player) {
    contentLog('ytSeek no player')

    return
  }

  const now = getCurrentTimestamp()
  const seekTo = (now - start) * player.getPlaybackRate()
  const TOLERANCE = 0.1
  const TIMETOSEEK = 1
  const KILO = 1000
  if (player.getState() !== 'playing' || Math.abs(player.getCurrentTime() - seekTo) > TOLERANCE) {
    state.ytProhibitUntil = 'playing'
    player.pause()
    player.seek(seekTo + TIMETOSEEK * player.getPlaybackRate())
    setTimeout(() => { player.play() }, TIMETOSEEK * KILO)
    contentLog(`YT state:${player.getState()}  cur:${player.getCurrentTime()}  toSeek:${seekTo}`)
  }
}
function ytSeekAndPause(time:number, state: ContentState) {
  const player = state.ytPlayer
  if (!player) {
    contentLog('ytSeek no player')

    return
  }

  if (player.getState() !== 'paused') {
    state.ytProhibitUntil = 'paused'
    player.pause()
  }
  if (player.getCurrentTime() !== time) {
    player.seek(time)
  }
}

/* Memo about youtube state
 *  played=time time=start time stamp  in ms
 *  paused=time time=current time in the clip.
*/

export const Content: React.FC<ContentProps> = (props:ContentProps) => {
  const classes = useStyles()
  const state = useRef<ContentState>(new ContentState())
  const contents = useStore()

  if (props.content.type === 'youtube' && state.current.ytPlayer) {
    const params = paramStr2map(props.content.url)
    if (params.has('playing')) {
      ytSeekAndPlay(Number(params.get('playing')), state.current)
    }else if (params.has('paused')) {
      ytSeekAndPause(Number(params.get('paused')), state.current)
    }
  }

  function ytUpdateState(newState: string, time:number, params:Map<string, string|undefined>) {
    params.delete('playing')
    params.delete('paused')
    params.set(newState, String(time))
    const newContent = Object.assign({}, props.content)
    newContent.url = paramMap2Str(params)
    contents.updateContents([newContent])
    contentLog(`YT sent state ${newState}`)
  }

  useEffect(
    () => {
      if (props.content.type === 'youtube' && props.content.id) {
        if (!state.current.ytPlayer) {
          const id = `#YT${props.content.id}`
          const player = new YouTubePlayer(id, {autoplay:true})
          state.current.ytPlayer = player
          contentLog('YTPlayer for ${id} created')

          player.on('error', err => contentLog('YT on error ', err))
          player.on('unstarted', () => contentLog('YT on unstarted'))
          player.on('ended', () => contentLog('YT on ended'))
          player.on('buffering', () => contentLog('YT on buffering'))
          player.on('cued', () => contentLog('YT on cued'))
          player.on('paused', () => {
            if (state.current.ytProhibitUntil) {
              if (state.current.ytProhibitUntil === 'paused') {
                state.current.ytProhibitUntil = ''
              }

              return
            }
            contentLog(`YT on paused at ${player.getCurrentTime()}`)
            const params = paramStr2map(props.content.url)
            if (!params.has('paused')) {
              ytUpdateState('paused', player.getCurrentTime(), params)
            }
          })
          player.on('playing', () => {
            if (state.current.ytProhibitUntil) {
              if (state.current.ytProhibitUntil === 'playing') {
                state.current.ytProhibitUntil = ''
              }

              return
            }
            contentLog('YT on playing')
            // tslint:disable-next-line: no-magic-numbers
            const params = paramStr2map(props.content.url)
            if (!params.has('playing')) { //  start time is not specified yet.
              const now = getCurrentTimestamp()
              const elasp = player.getCurrentTime() / player.getPlaybackRate()
              const start = now - elasp
              contentLog('playing=', start)
              ytUpdateState('playing', start, params)
            }
          })
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
      }else {
        if (state.current.ytPlayer) {
          state.current.ytPlayer.destroy()
        }
        state.current.ytPlayer = undefined
      }

    },
    [props.content.type, props.content.id],
  )

  return useMemo(() => {
    let rv
    if (props.content.type === 'img') {
      rv = <img className={classes.img} src={props.content.url} />
    }else if (props.content.type === 'iframe') {
      rv = <iframe className={classes.iframe} />
    }else if (props.content.type === 'youtube') {
      rv = <div id={`YT${props.content.id}`} className={classes.iframe} />
    }else if (props.content.type === 'text') {
      rv =  <div className={classes.text} >{props.content.url}</div>
    }else {
      rv = <div className={classes.text} >Unknow type:{props.content.type} for {props.content.url}</div>
    }
    //  contentLog(`useMemo rerender for ${props.url}`)

    return rv
  },             [props.content.url, props.content.type, props.content.id])
}
