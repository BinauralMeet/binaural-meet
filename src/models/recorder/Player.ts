import {ISharedContent, ISharedContentToSend, SharedContentInfoData} from '@models/ISharedContent'
import {BaseInformation, RemoteInformation, Viewpoint} from '@models/Participant'
import {diffSet, str2Mouse, str2Pose} from '@models/utils'
import {TrackStates} from '@stores/participants/ParticipantBase'
import {computed, makeObservable, observable} from 'mobx'
import {BMMessage} from '@models/conference/DataMessage'
import {MessageType} from '@models/conference/DataMessageType'
import { MediaClip } from '@stores/MapObject'
import {MediaKind, BlobKind, recLog} from './RecorderTypes'
import participants from '@stores/participants/Participants'
import contents from '@stores/sharedContents/SharedContents'
import { VRMRig } from '@models/utils/vrmIK'
declare const d:any                  //  from index.html

interface BlobHeader{
  cid?: string
  pid?: string
  role: string
  size: number
  kind: BlobKind
  time?: number
  duration?: number
}

class Message{
  msg: BMMessage
  time: number
  constructor(msg: BMMessage, time?:number){
    this.msg = msg
    this.time = time ? time : Date.now()
  }
}
class MessagesHeader{
  startTime = 0
  endTime = 0
  messages: Message[] = []
}
export class RecordHeader{
  messages = new MessagesHeader()
  blobs: BlobHeader[] = []
}
export interface DBRecMessage{
  id?: number
  messages: Message[]
  length: number
}

class MediaPlay{
  blob: Blob
  time: number
  duration: number
  cid?:string
  pid?:string
  role:string
  kind:MediaKind
  constructor(blob: Blob, header:BlobHeader){
    this.blob = blob
    this.time = header.time!
    if (!header.duration){
      console.error(`duration is needed. ${JSON.stringify(header)}`)
    }
    this.duration = header.duration!
    this.cid = header.cid
    this.pid = header.pid
    this.role = header.role
    if (header.kind === 'audio' || header.kind === 'video'){
      this.kind = header.kind
    }else{
      this.kind = 'invalid'
    }
    //recLog(`MediaPlay URL:${URL.createObjectURL(this.blob)} ${JSON.stringify(this)}`)
  }
}
type PlayerState = 'play' | 'pause' | 'stop'


interface ParticipantToPlay extends BaseInformation{
}
const defaultParticipantToPlay:ParticipantToPlay = {
  name:'', avatar: 'frog', color:[], textColor:[], avatarSrc:''
}


class Player{
  @computed get state(){ return this.state_ }
  @observable private state_: PlayerState = 'stop'
  @computed get currentTime(){ return this.currentTime_ }
  @observable private currentTime_: number = 0 //  current playback time.
  @computed get offset(){ return this.currentTime_ - this.startTime }
  @computed get duration(){ return this.endTime - this.startTime }
  private messages: Message[] = []
  private medias: MediaPlay[] = []
  private startTime = 0
  private endTime = 0
  private rate_ = 1.0
  get rate(){ return this.rate_}
  private playInterval = 0
  private pids = new Set<string>()
  private cids = new Set<string>()
  private pidsPlaying = new Set<string>()
  private cidsPlaying = new Set<string>()
  private mediasPlaying:MediaPlay[] = []
  private archive?:Blob
  private header_ = new RecordHeader()
  get header(){ return this.header_ }
  private title_=''
  get title(){ return this.title_ }
  constructor(){
    makeObservable(this)
  }

  clear(){
    this.messages = []
    this.medias = []
    this.startTime = 0
    this.endTime = 0
    this.header_ = new RecordHeader()
  }
  load(archiveOr: Blob|undefined, title: string, loadMedia: boolean){
    this.clear()
    if (archiveOr) this.archive = archiveOr
    else archiveOr = this.archive
    this.title_ = title
    const promise = new Promise<void>((resolve, reject) => {
      if (!archiveOr) {
        reject('Player.load() archive not set.')
        return
      }
      let start = 0
      const archive:Blob = archiveOr!
      archive.slice(start, start+4).arrayBuffer().then(buffer => {
        start += 4
        const view = new Int32Array(buffer)
        const headerLen = view[0]
        let count = 0
        archive.slice(start, start+headerLen).text().then(text => {
          start += headerLen
          const headers = JSON.parse(text) as BlobHeader[]
          //  recLog(JSON.stringify(headers))
          for(const header of headers){
            if (header.role === 'message'){
              //  eslint-disable-next-line no-loop-func
              archive.slice(start, start+header.size).text().then(text => {
                const msgsHeader = JSON.parse(text) as MessagesHeader
                this.header_.messages = msgsHeader
                this.messages = msgsHeader.messages
                this.currentTime_ = this.startTime = msgsHeader.startTime
                this.endTime = msgsHeader.endTime
                count ++
                if (count === headers.length){ resolve() }
              })
            }else{
              //  eslint-disable-next-line no-loop-func
              this.header_.blobs.push(header)
              if (loadMedia){
                archive.slice(start, start+header.size).arrayBuffer().then(ab => {
                  const blob = new Blob([ab])
                  this.medias.push(new MediaPlay(blob, header))
                  count ++
                  if (count === headers.length){ resolve() }
                })
              }else{
                count ++
                if (count === headers.length){ resolve() }
              }
            }
            start += header.size
          }
          if (archive.size !== start){
            console.error(`archive size ${archive.size} not matched to end of blobs ${start}.`)
          }
        })
      })
    })

    return promise
  }
  seek(offset: number){
    const messages = Array.from(this.messages)
    const medias = Array.from(this.medias)
    messages.sort((a,b) => a.time - b.time)
    medias.sort((a,b) => a.time - b.time)
    this.currentTime_ = this.startTime + offset
    //recLog(`seek ct=${this.currentTime}`)
    //let time = this.startTime + offset
    let ffTo = messages.findIndex(m=>m.time > this.currentTime) - 1
    if (ffTo === -2) ffTo = messages.length
    if (ffTo > 0){  //  first forward to ffTo
      const ffMsgs = messages.splice(0, ffTo)
      this.fastForwardMessage(ffMsgs, this.currentTime)
    }
    //  Play medias playing at currentTime
    this.pidsPlaying.clear()
    this.cidsPlaying.clear()
    const mediasNotPlayed:MediaPlay[] = []  //  Medias too early or too late for current time.
    while (medias.length && medias[0].time <= this.currentTime){
      const media = medias.shift()!
      if (this.playMedia(media, this.currentTime)){
        if (media.pid) this.pidsPlaying.add(`p_${media.pid}`)
        if (media.cid) this.cidsPlaying.add(`p_${media.cid}`)
        this.mediasPlaying.push(media)
      }else{
        mediasNotPlayed.push(media)
      }
    }
    mediasNotPlayed.push(...medias)
    for(const media of mediasNotPlayed){
      let clip
      if (media.pid && !this.pidsPlaying.has(`p_${media.pid}`)){
        clip = participants.playback.get(`p_${media.pid}`)?.clip
      }
      if (media.cid && !this.cidsPlaying.has(`p_${media.cid}`)){
        clip = contents.playbackClips.get(`p_${media.cid}`)
      }
      if (clip){
        if (media.kind === 'audio') clip.audioBlob = undefined
        if (media.kind === 'video') clip.videoBlob = undefined
      }
    }
    return ffTo
  }
  setRate(rate: number){
    this.rate_ = rate
    this.setRateToClips(rate)
  }
  play(){
    this.state_ = 'play'
    this.setPauseToClips(false)

    const messages = Array.from(this.messages)
    const medias = Array.from(this.medias)
    //*

    //  */

    messages.sort((a,b) => a.time - b.time)
    medias.sort((a,b) => a.time - b.time)

    recLog(`Play ${medias.length} medias.`)
    for(const media of medias){
      const {blob, ...m} = media
      recLog(`${JSON.stringify(m)}`)
    }

    //let time = this.startTime + offset
    const ffTo = messages.findIndex(m=>m.time >= this.currentTime) - 1
    if (ffTo > 0){  //  skip to ffTo
      messages.splice(0, ffTo)
    }

    const ffToMedia = medias.findIndex(m=>m.time >= this.currentTime) - 1
    if (ffToMedia > 0){  //  skip to ffToMedia
      medias.splice(0, ffToMedia)
    }

    let lastTime = Date.now()
    const step = () => {
      const nowTime = Date.now()
      const laspTime = nowTime - lastTime
      lastTime = nowTime
      this.currentTime_ = this.currentTime + laspTime * this.rate
      //  recLog(`play ct=${this.currentTime}`)
      //  Play message
      while (messages.length && messages[0].time < this.currentTime){
        const message = messages.shift()!
        const playFrom = this.currentTime - message.time
        this.playMessage(message.msg, playFrom)
      }
      //  Play media
      while (medias.length && medias[0].time < this.currentTime){
        const media = medias.shift()!
        if (this.playMedia(media, this.currentTime)){
          if (media.pid) this.pidsPlaying.add(`p_${media.pid}`)
          if (media.cid) this.pidsPlaying.add(`p_${media.cid}`)
          this.mediasPlaying.push(media)
        }
      }
      //  remove playing media
      const remains:MediaPlay[] = []
      for(const media of medias){
        if (media.time + media.duration > this.currentTime){
          remains.push(media)
        }else{
          if (media.pid) this.pidsPlaying.delete(`p_${media.pid}`)
          if (media.cid) this.cidsPlaying.delete(`p_${media.cid}`)
        }
      }
      this.mediasPlaying = remains

      if (this.currentTime > this.endTime){
        this.pause()
      }
    }
    if (!this.playInterval) this.playInterval = window.setInterval(step, 30)
  }
  setRateToClips(rate: number){
    this.pidsPlaying.forEach(pid=>{
      const p = participants.playback.get(pid)
      if (p && p.clip){
        p.clip.rate = rate
      }
    })
    this.cidsPlaying.forEach(cid=>{
      const clip = contents.playbackClips.get(cid)
      if (clip){
        clip.rate = rate
      }
    })
  }
  setPauseToClips(pause: boolean){
    recLog(`${pause? 'Pause' : 'Play'}`
      + ` pids: ${JSON.stringify(Array.from(this.pidsPlaying.values()))}`
      + ` cids: ${JSON.stringify(Array.from(this.cidsPlaying.values()))}`)
    this.pidsPlaying.forEach(pid=>{
      const p = participants.playback.get(pid)
      if (p && p.clip){
        p.clip.pause = pause
      }
    })
    this.cidsPlaying.forEach(cid=>{
      const clip = contents.playbackClips.get(cid)
      if (clip){
        clip.pause = pause
      }
    })
  }
  pause(){
    this.state_ = 'pause'
    if (this.playInterval){
      window.clearInterval(this.playInterval)
      this.playInterval = 0
    }
    this.setPauseToClips(true)
  }
  stop(){
    this.state_ = 'stop'
    if (this.playInterval){
      window.clearInterval(this.playInterval)
      this.playInterval = 0
    }
    this.cleanup()
    this.currentTime_ = 0
  }
  private cleanup(){
    this.state_ = 'stop'
    this.pids.forEach(pid=>{
      participants.removePlayback(pid)
    })
    this.pids.clear()
    this.pidsPlaying.clear()
    this.cids.forEach(cid=>{
      contents.removePlayback(cid)
    })
    this.cids.clear()
    this.cidsPlaying.clear()
  }

  private playMedia(media:MediaPlay, timeFrom:number){
    if (media.duration && media.duration < timeFrom - media.time || this.currentTime < media.time){
      return false //  Already ended or not start yet. Skip to play
    }
    ///*
    const {blob, ...m} = media
    recLog(`playMedia: ${this.currentTime%10000} ${JSON.stringify(m)}`) //  */

    let clip:MediaClip|undefined = undefined
    if (media.pid){
      const pid = `p_${media.pid}`
      this.pids.add(pid)
      const p = participants.getOrCreatePlayback(pid)
      if (!p.clip) p.clip = new MediaClip()
      clip = p.clip
    }else if (media.cid){
      const cid = `p_${media.cid}`
      this.cids.add(cid)
      clip = contents.getOrCreatePlaybackClip(cid)
    }
    if (this.state === 'pause') clip!.pause = true
    if (media.kind === 'audio'){
      clip!.audioTime = media.time
      clip!.audioFrom = timeFrom
      clip!.rate = this.rate
      clip!.audioBlob = media.blob
    }else if (media.kind === 'video'){
      clip!.videoTime = media.time
      clip!.videoFrom = timeFrom
      clip!.rate = this.rate
      clip!.videoBlob = media.blob
    }else{
      console.error(`Unknown media kind ${media.kind}`)
    }
    if (this.state === 'play') clip!.pause = false
    return true
  }

  private summarizeMessages(ff: Message[], bRemove: boolean){
    const participantMessages = new Map<string, Map<string, Message>>
    const contentMessages = new Map<string, Message>
    for(const m of ff){
      if (m.msg.t === MessageType.CONTENT_UPDATE_REQUEST){
        const contents = JSON.parse(m.msg.v) as ISharedContentToSend[]
        for(const content of contents){
          const newMessage = {...m}
          newMessage.msg = {...m.msg}
          newMessage.msg.v = JSON.stringify([content])
          contentMessages.set(content.id, newMessage)
        }
      }else if (m.msg.t === MessageType.CONTENT_REMOVE_REQUEST){
        if (bRemove){
          const cids = JSON.parse(m.msg.v) as string[]
          for(const cid of cids){
            contentMessages.delete(cid)
          }
        }
      }else if (m.msg.p){
        if (m.msg.t === MessageType.PARTICIPANT_LEFT){
          if (bRemove){
            const pidsLeft = JSON.parse(m.msg.v) as string[]
            for(const pid of pidsLeft){
              participantMessages.delete(pid)
            }
          }
        }else{
          let participant = participantMessages.get(m.msg.p)
          if (!participant){
            participant = new Map<string, Message>
            participantMessages.set(m.msg.p, participant)
          }
          participant.set(m.msg.t, m)
        }
      }
    }
    return {participantMessages, contentMessages}
  }
  public makeParticipantsAndContentsList(){
    const msgs = Array.from(this.header.messages.messages)
    msgs.sort((a,b) => a.time - b.time)
    const {participantMessages, contentMessages} = this.summarizeMessages(msgs, false)
    const parts = new Map<string, ParticipantToPlay>
    const conts = new Map<string, SharedContentInfoData>()
    participantMessages.forEach((p,pid) => {
      p.forEach(msgs => {
        if (msgs.msg.t === MessageType.PARTICIPANT_INFO){
          const info = JSON.parse(msgs.msg.v) as RemoteInformation
          parts.set(pid, info)
        }
      })
    })
    contentMessages.forEach(msg => {
      const cs = JSON.parse(msg.msg.v) as ISharedContentToSend[]
      const c = cs[0]
      conts.set(c.id, c)
    })
    return {parts, conts}
  }

  //  fastForward given ff:Message[]. timeToFF is used to set media related things.
  private fastForwardMessage(ff: Message[], timeToFF:number){
    const {participantMessages, contentMessages} =  this.summarizeMessages(ff, true)

    //  play summarized messages
    const pidsBefore = this.pids
    const cidsBefore = this.cids
    this.pids = new Set<string>()
    this.cids = new Set<string>()
    participantMessages.forEach(p => {
      p.forEach(m => {
        let playFrom = timeToFF - m.time
        if (playFrom < 0) playFrom = 0
        this.playMessage(m.msg, playFrom)
      })
    })
    contentMessages.forEach(m => {
      let playFrom = timeToFF - m.time
      this.playMessage(m.msg, playFrom)
    })
    const pidsDelete = diffSet(pidsBefore, this.pids)
    for(const pid of pidsDelete){
      participants.playback.delete(pid)
    }
    const cidsDelete = diffSet(cidsBefore, this.cids)
    for(const cid of cidsDelete){
      contents.playbackContents.delete(cid)
      contents.playbackClips.delete(cid)
    }
  }
  private playMessage(msg: BMMessage, playFrom: number){
    //recLog(`playMessage ${msg.t}`, msg)
    if (msg.t === MessageType.PARTICIPANT_LEFT){
      this.removeParticipants(msg)
    }else{
      const pid = msg.p ? `p_${msg.p}` : ''
      if (pid) this.pids.add(pid)
        const p = pid ? participants.getOrCreatePlayback(pid) : undefined
      let notHandled = true
      if (p){
        notHandled = false
        const v = JSON.parse(msg.v)
        switch(msg.t){
          case MessageType.PARTICIPANT_INFO: p.information = v as RemoteInformation; break
          case MessageType.PARTICIPANT_POSE: p.pose = str2Pose(v as string); break
          case MessageType.PARTICIPANT_MOUSE: p.mouse = str2Mouse(v as string); break
          case MessageType.PARTICIPANT_AFK: p.physics.awayFromKeyboard = v as boolean; break
          case MessageType.PARTICIPANT_TRACKSTATES: Object.assign(p.trackStates, v as TrackStates); break
          case MessageType.PARTICIPANT_VIEWPOINT: Object.assign(p.viewpoint, v as Viewpoint); break
          case MessageType.PARTICIPANT_ON_STAGE: p.physics.onStage = v as boolean; break
          case MessageType.PARTICIPANT_VRMRIG: p.vrmRig = v as VRMRig; break
          case MessageType.AUDIO_LEVEL: p.audioLevel = v as number; break
          default: notHandled = true; break
        }
      }
      if (notHandled){
        notHandled = false
        switch(msg.t){
          case MessageType.CONTENT_UPDATE_REQUEST: this.onContentUpdateRequest(msg, playFrom); break
          case MessageType.CONTENT_REMOVE_REQUEST: this.onContentRemoveRequest(msg); break
          default: notHandled = true; break
        }
      }
      if (notHandled){
        console.warn(`Playback did not handle message:`, msg)
      }
    }
  }
  private removeParticipants(msg: BMMessage){
    const pidsRemove = JSON.parse(msg.v) as string[]
    for(const pid of pidsRemove){
      participants.playback.delete(`p_${pid}`)
      this.pids.delete(`p_${pid}`)
    }
  }
  private onContentUpdateRequest(msg: BMMessage, from: number){
    const cs = JSON.parse(msg.v) as ISharedContent[]
    for(const c of cs){
      //  recLog('CONTENT_UPDATE_REQUEST:', c)
      c.id = `p_${c.id}`
      if (c.type === 'camera' || c.type === 'screen'){
        c.type = c.type === 'camera' ? 'playbackCamera' : 'playbackScreen'
      }
      contents.updatePlayback(c)
      this.cids.add(c.id)
    }
  }
  private onContentRemoveRequest(msg: BMMessage){
    const cids = JSON.parse(msg.v) as string[]
    for(const cid of cids){
      contents.removePlayback(`p_${cid}`)
      this.cids.delete(`p_${cid}`)
    }
  }
}
const player = new Player()
export default player
d.player = player
