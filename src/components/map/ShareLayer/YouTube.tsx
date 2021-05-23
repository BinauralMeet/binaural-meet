import {makeStyles} from '@material-ui/core/styles'
import {SharedContent as ISharedContent} from '@models/SharedContent'
import {assert, shallowEqualsForMap} from '@models/utils'
import {contentLog} from '@stores/sharedContents/SharedContents'
import { useObserver } from 'mobx-react-lite'
import React, {useEffect, useRef} from 'react'
import YouTubePlayer from 'yt-player'
import {ContentProps} from './Content'

//const contentLog = console.log

function getCurrentTimestamp() {

  return Date.now() * 0.001
}

const useStyles = makeStyles({
  iframe: {
    width: '100%',
    height: '100%',
  },
})
type YTState = 'paused' | 'playing' | 'ended'
type YTParam = YTState | 'rate' | 'index' | 'list' | 'v'

class YTMember{
  player?:YouTubePlayer
  prohibitUntil:YTState | '' | 'playingTwice' | 'forever' = ''
  pauseIntervalTimer = 0
  lastCurrentTimePaused = 0
  playTimeout:NodeJS.Timeout|null = null
  pauseTimeout:NodeJS.Timeout|null = null
  params: Map<YTParam, string|undefined> = new Map()
  content?: ISharedContent
  editing = false
  onUpdate: (newContent: ISharedContent) => void = ()=>{}
}

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
function clearAllTimer(member: YTMember){
  if (member.playTimeout){
    clearTimeout(member.playTimeout)
    member.playTimeout = null
  }
  if (member.pauseTimeout){
    clearTimeout(member.pauseTimeout)
    member.pauseTimeout = null
  }
}

function ytSeekAndPlay(start:number, index: number, member: YTMember) {
  assert(member.player)
  clearAllTimer(member)
  const now = getCurrentTimestamp()
  let seekTo = (now - start) * member.player.getPlaybackRate()
  const TOLERANCE = 0.1
  if (member.player.getState() === 'playing' &&
    (member.player.getPlaylist().length === 0 || member.player.getPlaylistIndex() === index) &&
    Math.abs(member.player.getCurrentTime() - seekTo) < TOLERANCE) {

    return  //  already playing and position is good.
  }

  //  seek and play
  member.prohibitUntil = 'playing'
  let seekTarget = -1000
  const onTime = () => {
    assert(member.player)
    const cur = member.player.getCurrentTime()
    if (member.player.getState() === 'paused' && Math.abs(seekTarget - cur) < TOLERANCE){
      member.player.play()
      contentLog(`ytSeekAndPlay: ${member.player.getState()}  ` +
      `cur:${member.player.getCurrentTime()}  toSeek:${seekTo}`, member.params)

      return
    }
    const now = getCurrentTimestamp()
    seekTo = (now - start) * member.player.getPlaybackRate()
    const TIMETOSEEK = 1
    seekTarget = seekTo + TIMETOSEEK * member.player.getPlaybackRate()
    if (member.player.getState() === 'unstarted'){
      member.player.play()
      member.prohibitUntil = 'playingTwice'
    }
    if (index >= 0 && index !== member.player.getPlaylistIndex()) {
      member.player.playVideoAt(index)
      member.prohibitUntil = 'playingTwice'
    }
    member.player.pause()
    member.player.seek(seekTarget)
    member.playTimeout = setTimeout(onTime, TIMETOSEEK * 1000)
  }
  onTime()
}
function ytSeekAndPause(time:number, member: YTMember) {
  assert(member.player)
  clearAllTimer(member)
  const pauseCheck = () => {
    assert(member.player)
    const indexStr = member.params.get('index')
    const index = Number(indexStr ? indexStr : -1)
  if (member.player.getState() !== 'paused' ||
    (index >= 0 && index !== member.player.getPlaylistIndex())){
      member.prohibitUntil = 'paused'
      if (member.player.getState() === 'unstarted'){ member.player.play() }
      if (index >= 0 && index !== member.player.getPlaylistIndex()) {
        member.player.playVideoAt(index)
      }
      member.player.pause()
      member.pauseTimeout = setTimeout(pauseCheck, 200)

      return
    }
    if (member.prohibitUntil === 'paused'){ member.prohibitUntil = '' }
    if (member.player.getCurrentTime() !== time) {
      member.player.seek(time)
      contentLog(`ytSeekAndPause seek to ${time}`, member.params)
    }
    member.lastCurrentTimePaused = member.player.getCurrentTime()
  }
  pauseCheck()
}
function deleteState(params: Map<string, string|undefined>){
  params.delete('playing')
  params.delete('paused')
  params.delete('ended')
}

function ytUpdateState(newState: string, time:number, member: YTMember) {
  const newParams = new Map<string, string|undefined>(member.params)
  deleteState(newParams)
  newParams.set(newState, String(time))
  newParams.set('rate', String(member.player?.getPlaybackRate()))
  const idx = member.player?.getPlaylistIndex()
  newParams.set('index', String(idx ? idx : -1))
  const newContent = Object.assign({}, member.content)
  newContent.url = paramMap2Str(newParams)

  member.onUpdate(newContent)
  contentLog(`YT sent member ${newState}`, newParams)
}

function ytPauseInterval(member: YTMember) {
  const state = member.player?.getState()
  if (!member.editing &&  state === 'paused' && member.params.has('paused')) {
    const currentTime = Number(member.player?.getCurrentTime())
    const TOLERANCE = 0.1
    //  contentLog(`YT ytPauseInterval cur:${currentTime}, last:${member.lastCurrentTimePaused}`)
    if (Math.abs(currentTime - member.lastCurrentTimePaused) > TOLERANCE) {
      member.lastCurrentTimePaused = currentTime
      member.params.set('paused', String(currentTime))
      const newContent = Object.assign({}, member.content)
      newContent.url = paramMap2Str(member.params)
      member.onUpdate(newContent)
      contentLog(`YT sent current time of paused state time:${currentTime}`, member.params)
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
  if (props.onUpdate){ member.onUpdate = props.onUpdate }

  //  Editing (No sync) ?
  const editing = useObserver(() => props.contents.editing === props.content.id)
  if (editing){
    member.prohibitUntil = 'forever'
  }else{
    member.prohibitUntil = ''
  }

  //  Check params and reflect them
  const newParams = paramStr2map(props.content.url)
  if (!editing && (member.editing || !shallowEqualsForMap(member.params, newParams))) {
    member.editing = editing
    member.params = newParams
    if (member.player) {
      member.player.setPlaybackRate(Number(member.params.get('rate')))
      if (member.params.has('playing')) {
        contentLog('YT render for play')
        ytSeekAndPlay(Number(member.params.get('playing')), Number(member.params.get('index')), member)
      }else if (member.params.has('paused')) {
        contentLog('YT render for pause')
        ytSeekAndPause(Number(member.params.get('paused')), member)
      }
    }
  }else{
    member.editing = editing
  }

  //  Create player when the component is created.
  useEffect(
    () => {
      if (props.content.id) {
        if (!member.player) {
          const id = `#YT${props.content.id}`
          const player = new YouTubePlayer(id, {autoplay:member.params.has('playing')})
          member.player = player
          contentLog(`YTPlayer for ${id} created`)
          //  set initial parameters
          if (member.params.has('rate')){
            player.setPlaybackRate(Number(member.params.get('rate')))
          }
          if (!member.editing){
            if (member.params.has('playing')) {
              ytSeekAndPlay(Number(member.params.get('playing')), Number(member.params.get('index')), member)
            }else if (member.params.has('paused')) {
              ytSeekAndPause(Number(member.params.get('paused')), member)
            }
          }

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

            contentLog(`YT on paused at ${player.getCurrentTime()} until=${member.prohibitUntil}`, member.params)

            if (member.prohibitUntil) {
              if (member.prohibitUntil === 'paused') {
                member.prohibitUntil = ''
              }

              return
            }
            if (!member.params.has('paused')) {
              contentLog('send paused')
              ytUpdateState('paused', player.getCurrentTime(), member)
            }
          })
          player.on('playing', () => {
            contentLog(`YT on playing until=${member.prohibitUntil}`, member.params)
            if (member.prohibitUntil) {
              if (member.prohibitUntil === 'playingTwice') {
                member.prohibitUntil = 'playing'
              }else if (member.prohibitUntil === 'playing') {
                member.prohibitUntil = ''
              }

              return
            }
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
              contentLog(`playing=${start}`, member.params)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [props.content.id],
  )

  return <div id={`YT${props.content.id}`} className={classes.iframe} />
}
