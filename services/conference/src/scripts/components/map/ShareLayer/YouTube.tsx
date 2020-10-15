import {makeStyles} from '@material-ui/core/styles'
import {SharedContent as ISharedContent} from '@models/SharedContent'
import {assert, shallowEqualsForMap} from '@models/utils'
import {SharedContents} from '@stores/sharedContents/SharedContents'
import {useStore} from 'hooks/SharedContentsStore'
import React, {useEffect, useRef} from 'react'
import YouTubePlayer from 'yt-player'
import {contentLog, ContentProps} from './Content'

function getCurrentTimestamp() {
  const MIL = 0.001

  return Date.now() * MIL
}

const useStyles = makeStyles({
  iframe: {
    width: '100%',
    height: '100%',
  },
})
class YTState{
  player?:YouTubePlayer
  prohibitUntil = ''
  pauseIntervalTimer = 0
  lastCurrentTimePaused = 0
  playTimeout:NodeJS.Timeout|null = null
  params: Map<string, string|undefined> = new Map()
  content?: ISharedContent
  contents?: SharedContents
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
function ytSeekAndPlay(start:number, index: number, state: YTState) {
  assert(state.player)
  if (index >= 0 && index !== state.player.getPlaylistIndex()) {
    state.prohibitUntil = 'playing'
    state.player.playVideoAt(index)
  }

  const now = getCurrentTimestamp()
  const seekTo = (now - start) * state.player.getPlaybackRate()
  const TOLERANCE = 0.1
  const TIMETOSEEK = 1
  const KILO = 1000
  if (state.player.getState() !== 'playing' || Math.abs(state.player.getCurrentTime() - seekTo) > TOLERANCE) {
    if (state.playTimeout) {
      clearTimeout(state.playTimeout)
      state.playTimeout = null
    }
    state.prohibitUntil = 'playing'
    state.player.pause()
    state.player.seek(seekTo + TIMETOSEEK * state.player.getPlaybackRate())
    state.playTimeout = setTimeout(() => { state.player?.play() }, TIMETOSEEK * KILO)
    contentLog(`YT state:${state.player.getState()}  cur:${state.player.getCurrentTime()}  toSeek:${seekTo}`)
  }
}
function ytSeekAndPause(time:number, state: YTState) {
  assert(state.player)
  if (state.player.getState() !== 'paused') {
    state.prohibitUntil = 'paused'
    state.player.pause()
  }
  if (state.player.getCurrentTime() !== time) {
    state.player.seek(time)
    contentLog(`pySeekAndPause seek to ${time}`)
  }
  state.lastCurrentTimePaused = state.player.getCurrentTime()
}

function ytUpdateState(newState: string, time:number, state: YTState) {
  const params = new Map<string, string|undefined>(state.params)
  params.delete('playing')
  params.delete('paused')
  params.set(newState, String(time))
  const newContent = Object.assign({}, state.content)
  newContent.url = paramMap2Str(params)
  state.contents?.updateContents([newContent])
  contentLog(`YT sent state ${newState}`)
}

function ytPauseInterval(state: YTState) {
  if (state.params.has('paused')) {
    const params = state.params
    const currentTime = Number(state.player?.getCurrentTime())
    const TOLERANCE = 0.1
    //  contentLog(`YT ytPauseInterval cur:${currentTime}, last:${state.lastCurrentTimePaused}`)
    if (Math.abs(currentTime - state.lastCurrentTimePaused) > TOLERANCE) {
      state.lastCurrentTimePaused = currentTime
      params.set('paused', String(currentTime))
      const newContent = Object.assign({}, state.content)
      newContent.url = paramMap2Str(params)
      state.contents?.updateContents([newContent])
      contentLog(`YT sent current time of paused state time:${currentTime}`)
    }
  }else {
    if (state.pauseIntervalTimer) {
      clearInterval(state.pauseIntervalTimer)
      state.pauseIntervalTimer = 0
    }
  }

  return undefined
}

/* Memo about youtube state
 *  played=time time=start time stamp  in ms
 *  paused=time time=current time in the clip.
*/

export const YouTube: React.FC<ContentProps> = (props:ContentProps) => {
  assert(props.content.type === 'youtube')

  const classes = useStyles()
  const state = useRef<YTState>(new YTState())
  state.current.contents = useStore()
  state.current.content = props.content

  //  Check params and reflect them
  const newParams = paramStr2map(props.content.url)
  if (!shallowEqualsForMap(state.current.params, newParams)) {
    state.current.params = newParams
    const params = state.current.params
    if (state.current.player) {
      if (params.has('playing')) {
        ytSeekAndPlay(Number(params.get('playing')), Number(params.get('index')), state.current)
      }else if (params.has('paused')) {
        ytSeekAndPause(Number(params.get('paused')), state.current)
      }
    }
  }

  //  Create player when the component is created.
  useEffect(
    () => {
      if (props.content.id) {
        if (!state.current.player) {
          const id = `#YT${props.content.id}`
          const player = new YouTubePlayer(id, {autoplay:true})
          state.current.player = player
          contentLog(`YTPlayer for ${id} created`)

          /*
          player.on('error', err => contentLog('YT on error ', err))
          player.on('unstarted', () => contentLog('YT on unstarted'))
          player.on('ended', () => contentLog('YT on ended'))
          player.on('buffering', () => contentLog('YT on buffering'))
          player.on('cued', () => contentLog('YT on cued')) */
          player.on('paused', () => {
            if (!state.current.pauseIntervalTimer) {
              const INTERVAL = 333
              state.current.pauseIntervalTimer
                = setInterval(ytPauseInterval, INTERVAL, state.current)
            }

            if (state.current.prohibitUntil) {
              if (state.current.prohibitUntil === 'paused') {
                state.current.prohibitUntil = ''
              }

              return
            }
            contentLog(`YT on paused at ${player.getCurrentTime()}`)
            if (!state.current.params.has('paused')) {
              ytUpdateState('paused', player.getCurrentTime(), state.current)
            }
          })
          player.on('playing', () => {
            if (state.current.prohibitUntil) {
              if (state.current.prohibitUntil === 'playing') {
                state.current.prohibitUntil = ''
              }

              return
            }
            contentLog('YT on playing')
            // tslint:disable-next-line: no-magic-numbers
            let indexUpdated = false
            if (player.getPlaylist().length > 0) {
              if (player.getPlaylistIndex() !== Number(state.current.params.get('index'))) {
                state.current.params.set('index', String(player.getPlaylistIndex()))
                indexUpdated = true
              }
            }
            if (!state.current.params.has('playing') || indexUpdated) { //  start time is not specified yet.
              const now = getCurrentTimestamp()
              const elasp = player.getCurrentTime() / player.getPlaybackRate()
              const start = now - elasp
              contentLog('playing=', start)
              ytUpdateState('playing', start, state.current)
            }
          })
        }

        const player = state.current.player
        if (player) {
          if (state.current.params.has('list')) {
            player.loadList({
              listType:'playlist',
              list:state.current.params.get('list') as string,
            })
          }else if (state.current.params.has('v')) {
            player.load(state.current.params.get('v') as string)
          }
        }
      }else {
        if (state.current.player) {
          state.current.player.destroy()
        }
        state.current.player = undefined
      }

    },
    [props.content.id],
  )

  return <div id={`YT${props.content.id}`} className={classes.iframe} />
}
