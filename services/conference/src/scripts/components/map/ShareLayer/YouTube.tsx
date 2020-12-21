import {makeStyles} from '@material-ui/core/styles'
import {SharedContent as ISharedContent} from '@models/SharedContent'
import {assert, shallowEqualsForMap} from '@models/utils'
import {contentLog} from '@stores/sharedContents/SharedContents'
import React, {useEffect, useRef} from 'react'
import YouTubePlayer from 'yt-player'
import {ContentProps} from './Content'

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
class YTMember{
  player?:YouTubePlayer
  prohibitUntil = ''
  pauseIntervalTimer = 0
  lastCurrentTimePaused = 0
  playTimeout:NodeJS.Timeout|null = null
  params: Map<YTParam, string|undefined> = new Map()
  content?: ISharedContent
  onUpdate: (newContent: ISharedContent) => void = ()=>{}
}
type YTParam = 'paused' | 'playing' | 'ended' | 'rate' | 'index' | 'list' | 'v'

export function paramArray2map(paramArray: string[]):Map<YTParam, string|undefined> {
  return new Map<YTParam, string|undefined>(
    paramArray.map(param => param.split('=') as [YTParam, string]))
}
export function paramStr2map(paramStr: string):Map<YTParam, string|undefined> {
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
function ytSeekAndPlay(start:number, index: number, member: YTMember) {
  assert(member.player)
  if (index >= 0 && index !== member.player.getPlaylistIndex()) {
    member.prohibitUntil = 'playing'
    member.player.playVideoAt(index)
  }

  const now = getCurrentTimestamp()
  const seekTo = (now - start) * member.player.getPlaybackRate()
  const TOLERANCE = 0.1
  const TIMETOSEEK = 1
  const KILO = 1000
  if (member.player.getState() !== 'playing' || Math.abs(member.player.getCurrentTime() - seekTo) > TOLERANCE) {
    if (member.playTimeout) {
      clearTimeout(member.playTimeout)
      member.playTimeout = null
    }
    member.prohibitUntil = 'playing'
    member.player.pause()
    member.player.seek(seekTo + TIMETOSEEK * member.player.getPlaybackRate())
    member.playTimeout = setTimeout(() => { member.player?.play() }, TIMETOSEEK * KILO)
    contentLog(`YT member:${member.player.getState()}  cur:${member.player.getCurrentTime()}  toSeek:${seekTo}`)
  }
}
function ytSeekAndPause(time:number, member: YTMember) {
  assert(member.player)
  if (member.player.getState() !== 'paused') {
    member.prohibitUntil = 'paused'
    member.player.pause()
  }
  if (member.player.getCurrentTime() !== time) {
    member.player.seek(time)
    contentLog(`pySeekAndPause seek to ${time}`)
  }
  member.lastCurrentTimePaused = member.player.getCurrentTime()
}

function ytUpdateState(newState: string, time:number, member: YTMember) {
  const params = new Map<string, string|undefined>(member.params)
  params.delete('playing')
  params.delete('paused')
  params.delete('ended')
  params.set(newState, String(time))
  params.set('rate', String(member.player?.getPlaybackRate()))
  const newContent = Object.assign({}, member.content)
  newContent.url = paramMap2Str(params)

  member.onUpdate(newContent)
  contentLog(`YT sent member ${newState}`)
}

function ytPauseInterval(member: YTMember) {
  if (member.params.has('paused')) {
    const params = member.params
    const currentTime = Number(member.player?.getCurrentTime())
    const TOLERANCE = 0.1
    //  contentLog(`YT ytPauseInterval cur:${currentTime}, last:${member.lastCurrentTimePaused}`)
    if (Math.abs(currentTime - member.lastCurrentTimePaused) > TOLERANCE) {
      member.lastCurrentTimePaused = currentTime
      params.set('paused', String(currentTime))
      const newContent = Object.assign({}, member.content)
      newContent.url = paramMap2Str(params)
      member.onUpdate(newContent)
      contentLog(`YT sent current time of paused state time:${currentTime}`)
    }
  }else {
    if (member.pauseIntervalTimer) {
      clearInterval(member.pauseIntervalTimer)
      member.pauseIntervalTimer = 0
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
  const memberRef = useRef<YTMember>(new YTMember())
  const member = memberRef.current
  member.content = props.content
  if (props.onUpdate){  member.onUpdate = props.onUpdate }

  //  Check params and reflect them
  const newParams = paramStr2map(props.content.url)
  if (!shallowEqualsForMap(member.params, newParams)) {
    member.params = newParams
    const params = member.params
    if (member.player) {
      member.player.setPlaybackRate(Number(params.get('rate')))
      if (params.has('playing')) {
        ytSeekAndPlay(Number(params.get('playing')), Number(params.get('index')), member)
      }else if (params.has('paused')) {
        ytSeekAndPause(Number(params.get('paused')), member)
      }
    }
  }

  //  Create player when the component is created.
  useEffect(
    () => {
      if (props.content.id) {
        if (!member.player) {
          const id = `#YT${props.content.id}`
          const player = new YouTubePlayer(id, {autoplay:true})
          member.player = player
          contentLog(`YTPlayer for ${id} created`)

          /*
          player.on('error', err => contentLog('YT on error ', err))
          player.on('unstarted', () => contentLog('YT on unstarted'))
          player.on('buffering', () => contentLog('YT on buffering'))
          player.on('cued', () => contentLog('YT on cued')) */
          player.on('ended', () => {
            ytUpdateState('ended', 0, member)
          })
          player.on('paused', () => {
            if (!member.pauseIntervalTimer) {
              const INTERVAL = 333
              member.pauseIntervalTimer
                = setInterval(ytPauseInterval, INTERVAL, member)
            }

            if (member.prohibitUntil) {
              if (member.prohibitUntil === 'paused') {
                member.prohibitUntil = ''
              }

              return
            }
            contentLog(`YT on paused at ${player.getCurrentTime()}`)
            if (!member.params.has('paused')) {
              ytUpdateState('paused', player.getCurrentTime(), member)
            }
          })
          player.on('playing', () => {
            if (member.prohibitUntil) {
              if (member.prohibitUntil === 'playing') {
                member.prohibitUntil = ''
              }

              return
            }
            contentLog('YT on playing')
            // tslint:disable-next-line: no-magic-numbers
            let indexUpdated = false
            if (player.getPlaylist().length > 0) {
              if (player.getPlaylistIndex() !== Number(member.params.get('index'))) {
                member.params.set('index', String(player.getPlaylistIndex()))
                indexUpdated = true
              }
            }
            if (!member.params.has('playing') || indexUpdated) { //  start time is not specified yet.
              const now = getCurrentTimestamp()
              const elasp = player.getCurrentTime() / player.getPlaybackRate()
              const start = now - elasp
              contentLog('playing=', start)
              ytUpdateState('playing', start, member)
            }
          })
          player.on('playbackRateChange', () => {
            const now = getCurrentTimestamp()
            const elasp = player.getCurrentTime() / player.getPlaybackRate()
            const start = now - elasp
            ytUpdateState(player.getState(), start, member)
          })
        }

        const player = member.player
        if (player) {
          if (member.params.has('list')) {
            player.loadList({
              listType:'playlist',
              list:member.params.get('list') as string,
            })
          }else if (member.params.has('v')) {
            player.load(member.params.get('v') as string)
          }
        }
      }else {
        if (member.player) {
          member.player.destroy()
        }
        member.player = undefined
      }

    },
    [props.content.id],
  )

  return <div id={`YT${props.content.id}`} className={classes.iframe} />
}
