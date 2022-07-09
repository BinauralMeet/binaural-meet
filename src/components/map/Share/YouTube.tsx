import {makeStyles} from '@material-ui/core/styles'
import {PARTICIPANT_SIZE} from '@models/Participant'
import {assert, normV, shallowEqualsForMap, subV2} from '@models/utils'
import {calcVolume} from '@stores/AudioParameters/StereoParameters'
import {contentLog} from '@stores/sharedContents/SharedContents'
import {useObserver} from 'mobx-react-lite'
import React, {useEffect, useRef} from 'react'
import YouTubePlayer from 'yt-player'
import {ContentProps} from './Content'

const PLAYTIME_TOLERANCE = 0.1
//const contentLog = console.log
const CHECK_INTERVAL = 333
const VOLUME_INTERVAL = 200

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
  goal: YTState|'' = ''
  skipOnPlaying = 0
  pauseIntervalTimer = 0
  lastCurrentTimePaused = 0
  playTimeout = 0
  pauseTimeout = 0
  params: Map<YTParam, string|undefined> = new Map()
  editing = false
  prevRelPos:[number, number] = [0, 0]
  volumeUI = 0.5          //  volume set by user
  volumeDist = 0          //  volume by distance
  prevVolumeDist = 0      //  previous volume by distance
  volumeIntervalTimer = 0 //  interval timer to check and update volume
  props!: ContentProps
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
    member.playTimeout = 0
  }
  if (member.pauseTimeout){
    clearTimeout(member.pauseTimeout)
    member.pauseTimeout = 0
  }
}

function ytSeekAndPlay(start:number, index: number, member: YTMember) {
  assert(member.player)
  member.goal = 'playing'
  clearAllTimer(member)
  const now = getCurrentTimestamp()
  let seekTo = (now - start) * member.player.getPlaybackRate()
  if (member.player.getState() === 'playing' &&
    (member.player.getPlaylist().length === 0 || member.player.getPlaylistIndex() === index) &&
    Math.abs(member.player.getCurrentTime() - seekTo) < PLAYTIME_TOLERANCE) {

    return  //  already playing and position is good.
  }

  //  seek and play
  let seekTarget = -1000
  const onTime:TimerHandler = () => {
    if (!member.player) { return }
    const cur = member.player.getCurrentTime()
    //  In case we can start to play now
    if (member.player.getState() === 'paused' && Math.abs(seekTarget - cur) < PLAYTIME_TOLERANCE){
      member.player.play()
      contentLog(`ytSeekAndPlay: ${member.player.getState()}  ` +
      `cur:${member.player.getCurrentTime()}  toSeek:${seekTo}`, member.params)

      return
    }

    //  Otherwise, seek, pause and wait again.
    const now = getCurrentTimestamp()
    seekTo = (now - start) * member.player.getPlaybackRate()
    const TIMETOSEEK = 1
    seekTarget = seekTo + TIMETOSEEK * member.player.getPlaybackRate()
    let duration = member.player.getDuration()
    if (member.player.getState() === 'unstarted' || !duration){
      member.skipOnPlaying = 1
      member.player.play()
      duration = member.player.getDuration()
    }
    if (index >= 0 && index !== member.player.getPlaylistIndex()) {
      member.skipOnPlaying = 1
      member.player.playVideoAt(index)
      duration = member.player.getDuration()
    }
    if (duration){
      member.player.pause()
      if (seekTarget > duration) {
        seekTarget = seekTarget % duration
        start = now + TIMETOSEEK - seekTarget / member.player.getPlaybackRate()
      }
      member.player.seek(seekTarget)
    }
    member.playTimeout = setTimeout(onTime, TIMETOSEEK * 1000)
  }
  onTime()
}
function ytSeekAndPause(time:number, member: YTMember) {
  assert(member.player)
  member.goal = 'paused'
  clearAllTimer(member)
  const pauseCheck:TimerHandler = () => {
    if (!member.player) { return }
    const indexStr = member.params.get('index')
    const index = Number(indexStr ? indexStr : -1)
    //  make it paused state.
    if (member.player.getState() !== 'paused' ||
      (index >= 0 && index !== member.player.getPlaylistIndex())) {
      if (member.player.getState() === 'unstarted') { member.player.play() }
      if (index >= 0 && index !== member.player.getPlaylistIndex()) {
        member.player.playVideoAt(index)
      }
      member.player.pause()
      member.pauseTimeout = setTimeout(pauseCheck, CHECK_INTERVAL)

      return
    }
    //  Check if the seek time achieves goal
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

function ytUpdateState(newState: YTState, time:number, member: YTMember) {
  deleteState(member.params)
  member.params.set(newState, String(time))
  member.params.set('rate', String(member.player?.getPlaybackRate()))
  const idx = member.player?.getPlaylistIndex()
  member.params.set('index', String(idx ? idx : -1))
  member.props.content.url = paramMap2Str(member.params)
  member.props.updateAndSend(member.props.content)
  contentLog(`YT SEND state ${newState} t=${time}`, member.params)
}

function ytPauseInterval(member: YTMember) {  //  Seeked by user duruing paused.
  if (!member.player) { return }
  const state = member.player.getState()
  if (!member.editing && member.goal==='' && state === 'paused') {
    //  when local and remote state is paused (already sent paused).
    const currentTime = member.player.getCurrentTime()
    contentLog(`YT ytPauseInterval cur:${currentTime}, last:${member.lastCurrentTimePaused} param${member.params.get('paused')}`)
    if (Math.abs(currentTime - member.lastCurrentTimePaused) > PLAYTIME_TOLERANCE) {
      member.lastCurrentTimePaused = currentTime
      const paramTime = Number(member.params.get('paused'))
      if (currentTime !== paramTime){
        ytUpdateState('paused', currentTime, member)
      }
    }
  }else {
    if (member.pauseIntervalTimer) {
      clearInterval(member.pauseIntervalTimer)
      member.pauseIntervalTimer = 0
    }
  }

  return undefined
}

function updateUIVolume(member:YTMember){
  if (!member.player){ return }
  if (member.volumeDist === 1 && member.prevVolumeDist === 1){
    const curVolume = member.player.getVolume() / 100
    if (curVolume !== member.volumeUI){
      member.volumeUI = curVolume
      //  console.log(`volumeUI Changed:${member.volumeUI} cur:${curVolume}`)
    }
  }else{
    member.player.setVolume(member.volumeUI * member.volumeDist * 100)
  }
  member.prevVolumeDist = member.volumeDist
}
function updateVolume(distance:number, member: YTMember){
  if (member.player){
    member.volumeDist = calcVolume(distance)
    member.player.setVolume(member.volumeUI * member.volumeDist * 100)
    //  console.log(`updateVolume(${distance}) UI:${member.volumeUI} D:${member.volumeDist}`)
  }
}
function checkPositionsForVolume(member:YTMember){
  if (!member.props.stores.participants) { return }
  updateUIVolume(member)
  const relPos = subV2(member.props.content.pose.position, member.props.stores.participants.local.pose.position)
  const diff = subV2(relPos, member.prevRelPos)
  if (normV(diff) > PARTICIPANT_SIZE * 0.1){
    member.prevRelPos = [relPos[0], relPos[1]]
    for(let i=0; i<2; i++){
      if (relPos[i] < 0){
        relPos[i] += member.props.content.size[i]
        if (relPos[i] > 0) { relPos[i] = 0 }
      }
    }
    const dist = normV(relPos)
    updateVolume(dist, member)
  }
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
  member.props = props

  //  Editing (No sync) ?
  const editing = useObserver(() => props.stores.contents.editing === props.content.id)

  //  Check params and reflect them to ytPlayer
  const oldParams = member.params
  member.params = paramStr2map(props.content.url)
  if (!editing && (member.editing || !shallowEqualsForMap(member.params, oldParams))) {
    if (member.player) {
      if (member.params.get('rate') !== oldParams.get('rate')){ //  set playback rate
        member.player.setPlaybackRate(Number(member.params.get('rate')))
      }
      //  set state
      const newPlaying = member.params.get('playing')
      const moveToPlay = newPlaying!==undefined && newPlaying !== oldParams.get('playing')
      const newPaused = member.params.get('paused')
      const moveToPause = newPaused!==undefined && newPaused !== oldParams.get('paused')
      if (moveToPlay) {
        contentLog(`YT render move to play=${newPlaying} state`)
        ytSeekAndPlay(Number(member.params.get('playing')), Number(member.params.get('index')), member)
      }else if (moveToPause) {
        contentLog(`YT render move to pause=${newPaused} state`)
        ytSeekAndPause(Number(member.params.get('paused')), member)
      }
    }
  }
  member.editing = editing

  //  Create player when the component is created.
  useEffect(
    () => {
      assert(props.content.id)
      let selfPlayed = false
      if (!member.player) {
        const id = `#YT${props.content.id}`
        const player = new YouTubePlayer(id)
        if (!member.params.has('playing') && !member.params.has('paused') && !member.params.has('ended')){
          //member.skipOnPlaying = 1
          selfPlayed = true
          member.params.set('playing', String(-1))
          player.play()
        }
        member.player = player
        contentLog(`YTPlayer for ${id} created`)
        //  set initial parameters
        if (member.params.has('rate')){
          player.setPlaybackRate(Number(member.params.get('rate')))
        }
        if (!member.editing){
          if (member.params.has('paused')) {
            ytSeekAndPause(Number(member.params.get('paused')), member)
          }else if (!selfPlayed && member.params.has('playing')){
            ytSeekAndPlay(Number(member.params.get('playing')), Number(member.params.get('index')), member)
          }
        }

        ///*
        player.on('error', (err:any) => contentLog('YT on error ', err))
        player.on('buffering', () => contentLog('YT on buffering'))
        player.on('cued', () => contentLog('YT on cued'))     //  */

        player.on('unstarted', () => {
          contentLog('YT on unstarted')
          player.unMute()
        })
        player.on('ended', () => {
          contentLog('YT on ended')
          if (member.player){
            const now = getCurrentTimestamp()
            ytSeekAndPlay(now, 0, member)
          }
          //ytUpdateState('ended', 0, member)
        })
        player.on('paused', () => {
          contentLog(`YT on paused at ${player.getCurrentTime()} goal:${member.goal}`, member.params)
          if (member.goal === 'paused') { //  paused by remote
            member.goal = ''
          }else if(member.goal === ''){   //  paused by user's operation
            if (!member.params.has('paused')) {
              setTimeout(()=>{
                if (!member.params.has('paused') && !member.params.has('playing') && player.getState() === 'paused'){
                  ytUpdateState('paused', player.getCurrentTime(), member)
                }
              }, 1000)
            }
          }else{
            contentLog(`paused for goal ${member.goal}`)
          }
          //  Add interval timer to check seek when paused is acheived.
          if (member.goal === '' && !member.pauseIntervalTimer) {
            member.pauseIntervalTimer
              = setInterval(ytPauseInterval, CHECK_INTERVAL, member)
          }
        })
        player.on('playing', () => {
          contentLog(`YT on playing goal=${member.goal} skip=${member.skipOnPlaying}`, member.params)
          let indexUpdated = false
          if (player.getPlaylist().length > 0) {
            if (player.getPlaylistIndex() !== Number(member.params.get('index'))) {
              member.params.set('index', String(player.getPlaylistIndex()))
              indexUpdated = true
            }
          }
          if (member.goal === 'playing'){ //  play by remote
            if (member.skipOnPlaying){
              member.skipOnPlaying = 0
            }else{
              member.goal = ''
            }
          }else if (member.goal === ''){
            const now = getCurrentTimestamp()
            const elasp = player.getCurrentTime() / player.getPlaybackRate()
            const start = now - elasp
            let started = Number(member.params.get('playing'))
            if (started === -1){ started = start }
            const diff = start - started
            if (!member.params.has('playing') || indexUpdated || Math.abs(diff) > PLAYTIME_TOLERANCE) {
              //  play by user or index in play list changed or seeked.
              ytUpdateState('playing', start, member)
            }
          }
        })
        player.on('playbackRateChange', () => {
          contentLog(`YT on playbackRateChange`)
          const now = getCurrentTimestamp()
          const elasp = player.getCurrentTime() / player.getPlaybackRate()
          const start = now - elasp
          const state = player.getState()
          const ytState:YTState = state === 'paused' ? 'paused' : state === 'playing' ? 'playing' : 'ended'
          ytUpdateState(ytState, start, member)
        })
      }

      //  set video clip id
      const player = member.player
      if (player) {
        if (member.params.has('list')) {
          player.loadList({
            listType:'playlist',
            list:member.params.get('list') as string,
          })
          contentLog(`YT loadList: ${member.params.get('list')}`)
        }else if (member.params.has('v')) {
          player.load(member.params.get('v') as string)
          contentLog(`YT load: ${member.params.get('v')}`)
        }
      }

      if (!member.volumeIntervalTimer){
        member.volumeIntervalTimer = setInterval(checkPositionsForVolume, VOLUME_INTERVAL, member)
      }

      return () => {
        if (member.player) {
          member.player.destroy()
        }
        member.player = undefined
        if (member.volumeIntervalTimer){
          clearInterval(member.volumeIntervalTimer)
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  return <div id={`YT${props.content.id}`} className={classes.iframe} />
}
