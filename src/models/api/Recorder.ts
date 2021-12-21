import {Stores} from '@components/utils'
import {ISharedContent} from '@models/ISharedContent'
import {ParticipantBase, RemoteInformation, Viewpoint} from '@models/Participant'
import {mouse2Str, pose2Str, str2Mouse, str2Pose} from '@models/utils'
import {LocalParticipant} from '@stores/participants/LocalParticipant'
import { TrackStates } from '@stores/participants/ParticipantBase'
import participants from '@stores/participants/Participants'
import {RemoteParticipant} from '@stores/participants/RemoteParticipant'
import {extractContentDataAndIds} from '@stores/sharedContents/SharedContentCreator'
import contents from '@stores/sharedContents/SharedContents'
import {autorun, IReactionDisposer} from 'mobx'
import {BMMessage} from './BMMessage'
import {MessageType} from './MessageType'

declare const d:any                  //  from index.html

type StreamRole = 'mic' | 'avatar' | 'camera' | 'screen'

class MediaRec{
  startTime = 0
  endTime = 0
  private media: MediaRecorder
  get state(){ return this.media.state }
  pid?: string
  cid?: string
  role: StreamRole
  blobs: Blob[] = []
  onData: (media:MediaRec)=>void = ()=>{}
  constructor(stream: MediaStream, role:StreamRole, opt?: {cid?:string, pid?: string}){
    this.role = role
    this.pid = opt?.pid
    this.cid = opt?.cid
    this.media = new MediaRecorder(stream)
    this.media.addEventListener('dataavailable', this.onDataAvailable.bind(this))
    this.media.addEventListener('stop', this.onStop.bind(this) )
  }
  start(){
    if (this.media.state === 'inactive'){
      this.media.start()
      this.startTime = Date.now()
    }else{
      console.error(`Failed to start. Media for cid:${this.cid} pid:${this.pid}`
        + ` is already in ${this.media.state}.`, this)
    }
  }
  stop(){
    if (this.media.state !== 'inactive'){
      this.media.stop()
    }
  }
  private onStop(){
    this.endTime = Date.now()
  }
  private onDataAvailable(ev: BlobEvent){
    const blob = ev.data
    this.blobs.push(blob)
    //console.log(`p:${this.pid} c:${this.cid} role:${this.role} blob type:${blob.type} size:${blob.size}`
    //  + `url:${window.URL.createObjectURL(blob)}`)
    this.onData(this)
  }
}
export interface BlobHeader{
  cid?: string
  pid?: string
  role: string
  size: number
  type: string
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

interface JSONPart{
  startTime: number
  endTime: number
  messages: Message[]
}
export class Recorder{
  medias = new Map<string, MediaRec>()
  messages: Message[] = []
  recording = false
  startTime = 0
  endTime = 0

  private MessageTypesToRecord = new Set<string>([
    MessageType.PARTICIPANT_INFO, MessageType.PARTICIPANT_POSE, MessageType.PARTICIPANT_MOUSE,
    MessageType.PARTICIPANT_AFK, MessageType.PARTICIPANT_TRACKSTATES, MessageType.PARTICIPANT_VIEWPOINT,
    MessageType.PARTICIPANT_ON_STAGE, MessageType.CONTENT_UPDATE_REQUEST, MessageType.CONTENT_REMOVE_REQUEST])
  private lastMessageValues= new Map<string, string>()
  recordMessage(msg:BMMessage){
    if (this.recording && this.MessageTypesToRecord.has(msg.t)){
      if (msg.t === MessageType.PARTICIPANT_MOUSE || msg.t === MessageType.PARTICIPANT_POSE){
        if (this.lastMessageValues.get(msg.t) !== msg.v){
          this.lastMessageValues.set(msg.t, msg.v)
          this.messages.push(new Message(msg))
        }
      }else{
        this.messages.push(new Message(msg))
      }
    }
  }

  private stoppedMedias: MediaRec[] = []
  clear(){
    this.medias.clear()
    this.messages = []
    this.stoppedMedias = []
    this.startTime = 0
    this.endTime = 0
    this.lastMessageValues.clear()
  }
  private disposers:IReactionDisposer[] = []
  start(stores: Stores){
    this.clear()
    //  start recording
    this.recording = true
    this.startTime = Date.now()
    //  list all track related to participants and contents
    this.disposers.push(autorun(()=>{
      this.updateMediaRecorders()
    }))

    //  Record all contents
    const cs = extractContentDataAndIds(stores.contents.all)
    this.messages.push({msg:{t:MessageType.CONTENT_UPDATE_REQUEST, v:JSON.stringify(cs)}, time: Date.now()})
    //  Record all participants
    const participants:ParticipantBase[] = Array.from(stores.participants.remote.values())
    participants.unshift(stores.participants.local)
    for(const p of participants){
      this.messages.push(
        {msg:{t:MessageType.PARTICIPANT_INFO, p:p.id, v:JSON.stringify(p.information)}, time: Date.now()})
      this.messages.push(
        {msg:{t:MessageType.PARTICIPANT_POSE, p: p.id, v:JSON.stringify(pose2Str(p.pose))}, time: Date.now()})
      this.messages.push(
        {msg:{t:MessageType.PARTICIPANT_MOUSE, p: p.id, v:JSON.stringify(mouse2Str(p.mouse))}, time: Date.now()})
    }
  }
  private stopMediaRecordings(){
    this.recording = false
    let count = 0
    const promise = new Promise<MediaRec[]>((resolve, reject)=>{
      const resolveAll = ()=>{
        count ++
        if (count === medias.length){
          resolve(medias)
        }
      }
      const medias = this.stoppedMedias
      medias.push(...this.medias.values())
      if (medias.length){
        for(const media of medias) {
          if (media.state === 'inactive'){
            resolveAll()
          }else{
            // eslint-disable-next-line no-loop-func
            media.onData = () => { resolveAll() }
            media.stop()
          }
        }
      }else{
        resolve(medias)
      }
    })

    return promise
  }
  stop(){
    for(const d of this.disposers){ d() }
    this.disposers = []
    const promise = new Promise<Blob>((resolve)=>{
      this.stopMediaRecordings().then((medias:MediaRec[])=>{
        this.endTime = Date.now()
        const blobs:Blob[] = []
        const headers:BlobHeader[] = []
        const jsonPart:JSONPart = {startTime:this.startTime, endTime: this.endTime, messages:this.messages}
        const blob = new Blob([JSON.stringify(jsonPart)], {type:'application/json'})
        const header:BlobHeader = {role:'message', size:blob.size, type:blob.type}
        blobs.push(blob)
        headers.push(header)
        for(const m of medias){
          if (m.blobs.length){
            const blob = new Blob(m.blobs)
            const header:BlobHeader = {
              pid:m.pid, cid: m.cid, role:m.role, size:blob.size, type:m.blobs[0].type,
              time: m.startTime, duration: m.endTime - m.startTime}
            blobs.push(blob)
            headers.push(header)
          }
        }

        blobs.unshift(new Blob([JSON.stringify(headers)], {type:'application/json'}))
        const headerLen = new Uint32Array(1)
        headerLen[0] = blobs[0].size
        blobs.unshift(new Blob([headerLen]))
        const all = new Blob(blobs, {type:'application/octet-stream'})
        resolve(all)
      })
    })

    return promise
  }

  private updateMediaRecorders(){
    const remains = new Set(this.medias.keys()) //  medias which should be deleted
    //  Participants
    const all:(RemoteParticipant|LocalParticipant)[] = Array.from(participants.remote.values())
    all.push(participants.local)
    for(const p of all){
      const vid = `pv_${p.id}`
      remains.delete(vid)
      if (p.tracks.avatarStream){
        if (!this.medias.has(vid)){
          const media = new MediaRec(p.tracks.avatarStream, 'avatar', {pid:p.id})
          this.medias.set(vid, media)
          media.start()
        }
      }else{
        const media = this.medias.get(vid)
        if (media){
          media.stop()
          this.stoppedMedias.push(media)
          this.medias.delete(vid)
        }
      }
      const aid = `pa_${p.id}`
      if (p.tracks.audioStream){
        if (!this.medias.has(aid)){
          const media = new MediaRec(p.tracks.audioStream, 'mic', {pid:p.id})
          this.medias.set(aid, media)
          media.start()
        }
      }else{
        const media = this.medias.get(aid)
        if (media){
          media.stop()
          this.stoppedMedias.push(media)
          this.medias.delete(aid)
        }
      }
    }
    //  Contents
    const contentStreams = contents.tracks.allContentStreams()
    for (const cs of contentStreams){
      const c = contents.find(cs.cid)
      if (c && (c.type === 'screen' || c.type === 'camera')){
        const id = `c_${c.id}`
        remains.delete(id)
        if (!this.medias.has(id)){
          const media = new MediaRec(cs.stream, c.type, {cid:c.id})
          this.medias.set(id, media)
          media.start()
        }
      }else{
        console.error(`Failed to find content cid=${cs.cid}.`)
      }
    }
    //  Remove when participat or content has removed
    for(const id of remains){
      const media = this.medias.get(id)
      if (media){
        media.stop()
        this.stoppedMedias.push(media)
        this.medias.delete(id)
      }
    }
  }
}

class MediaPlay{
  blob: Blob
  time: number
  duration?: number
  cid?:string
  pid?:string
  role:string
  constructor(blob: Blob, header:BlobHeader){
    this.blob = blob
    this.time = header.time!
    this.duration = header.duration
    this.cid = header.cid
    this.pid = header.pid
    this.role = header.role
  }
}
class Player{
  messages: Message[] = []
  medias: MediaPlay[] = []
  startTime = 0
  endTime = 0
  clear(){
    this.messages = []
    this.medias = []
    this.startTime = 0
    this.endTime = 0
  }
  load(archive: Blob){
    this.clear()
    const promise = new Promise<Player>((resolve) => {
      let start = 0
      archive.slice(start, start+4).arrayBuffer().then(buffer => {
        start += 4
        const view = new Int32Array(buffer)
        const headerLen = view[0]
        let count = 0
        archive.slice(start, start+headerLen).text().then(text => {
          start += headerLen
          const headers = JSON.parse(text) as BlobHeader[]
          //  console.log(JSON.stringify(headers))
          for(const header of headers){
            if (header.role === 'message'){
              //  eslint-disable-next-line no-loop-func
              archive.slice(start, start+header.size).text().then(text => {
                const jsonPart = JSON.parse(text) as JSONPart
                this.messages = jsonPart.messages
                this.startTime = jsonPart.startTime
                this.endTime = jsonPart.endTime
                count ++
                if (count === headers.length){ resolve(this) }
              })
            }else{
              //  eslint-disable-next-line no-loop-func
              archive.slice(start, start+header.size).arrayBuffer().then(ab => {
                const blob = new Blob([ab], {type:header.type})
                this.medias.push(new MediaPlay(blob, header))
                count ++
                if (count === headers.length){ resolve(this) }
              })
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
  play(){
    const messages = Array.from(this.messages)
    const medias = Array.from(this.medias)
    messages.sort((a,b) => a.time - b.time)
    medias.sort((a,b) => a.time - b.time)
    let time = this.startTime
    const timeDiff = Date.now() - this.startTime
    const step = () => {
      time = Date.now() - timeDiff
      while (messages.length && messages[0].time < time){
        const message = messages.shift()!
        player.playMessage(message.msg)
      }
      while (medias.length && medias[0].time < time){
        const media = medias.shift()!
        player.playMedia(media)
        if (media.duration) {
          setTimeout(()=>{
            this.stopMedia(media)
          }, media.duration)
        }
      }
      if (time < player.endTime){
        setTimeout(() => {step()}, 30)
      }else{
        this.cleanup()
      }
    }
    step()
  }
  private pids = new Set<string>()
  private cids = new Set<string>()
  private cleanup(){
    this.pids.forEach(pid=>{
      participants.removePlayback(pid)
    })
    this.cids.forEach(cid=>{
      contents.removePlayback(cid)
    })
  }

  private contentMeidas = new Map<string, MediaPlay>()
  private stopMedia(media:MediaPlay){
    if (media.pid && media.role === 'avatar'){
      const pid = `p_${media.pid}`
      const p = participants.getPlayback(pid)
      p.videoBlob = undefined
    }
  }
  private playMedia(media:MediaPlay){
      //  console.log(`media:${media.blob.type}, pid:${media.pid}, cid:${media.pid}, role:${media.role}`)
    if (media.pid){
      const pid = `p_${media.pid}`
      this.pids.add(pid)
      const p = participants.getPlayback(pid)
      if (media.role === 'mic'){
        p.audioBlob = media.blob
      }else if (media.role === 'avatar'){
        p.videoBlob = media.blob
      }
    }else if (media.cid){
      const cid = `p_${media.cid}`
      if (!this.contentMeidas.has(cid)){
        this.contentMeidas.set(cid, media)
        if (this.cids.has(cid)){
          const playback = contents.findPlayback(cid)
          if (playback){
            playback.url = URL.createObjectURL(media.blob)
            contents.updatePlayback(Object.assign({}, playback))
          }
        }
      }
    }
  }
  private playMessage(msg: BMMessage){
    //console.log(`playMessage ${msg.t}`, msg)
    const pid = msg.p ? `p_${msg.p}` : ''
    if (pid){ this.pids.add(pid) }
    const p = pid ? participants.getPlayback(pid) : undefined
    let notHandled = false
    const v = JSON.parse(msg.v)
    if (p){
      switch(msg.t){
        case MessageType.PARTICIPANT_INFO: p.information = v as RemoteInformation; break
        case MessageType.PARTICIPANT_POSE: p.pose = str2Pose(v as string); break
        case MessageType.PARTICIPANT_MOUSE: p.mouse = str2Mouse(v as string); break
        case MessageType.PARTICIPANT_AFK: p.physics.awayFromKeyboard = v as boolean; break
        case MessageType.PARTICIPANT_TRACKSTATES: Object.assign(p.trackStates, v as TrackStates); break
        case MessageType.PARTICIPANT_VIEWPOINT: Object.assign(p.viewpoint, v as Viewpoint); break
        case MessageType.PARTICIPANT_ON_STAGE: p.physics.onStage = v as boolean; break
        default: notHandled = true; break
      }
    }
    if (notHandled){
      notHandled = false
      switch(msg.t){
        case MessageType.CONTENT_UPDATE_REQUEST: this.onUpdateRequest(msg); break
        case MessageType.CONTENT_REMOVE_REQUEST: this.onRemoveRequest(msg); break
        default: notHandled = true; break
      }
    }
    if (notHandled){
      console.warn(`Playback did not handle message:`, msg)
    }
  }
  private onUpdateRequest(msg: BMMessage){
    const cs = JSON.parse(msg.v) as ISharedContent[]
    for(const c of cs){
      //  console.log('CONTENT_UPDATE_REQUEST:', c)
      c.id = `p_${c.id}`
      if (c.type === 'camera' || c.type === 'screen'){
        c.type = c.type === 'camera' ? 'playbackCamera' : 'playbackScreen'
        c.url = ''
        const media = this.contentMeidas.get(c.id)
        if (media){
          c.url = URL.createObjectURL(media.blob)
        }
        contents.updatePlayback(c)
        this.cids.add(c.id)
      }else{
        contents.updatePlayback(c)
        this.cids.add(c.id)
      }
    }
  }
  private onRemoveRequest(msg: BMMessage){
    const cids = JSON.parse(msg.v) as string[]
    for(const cid of cids){
      contents.removePlayback(`p_${cid}`)
    }
  }
}

export const recorder = new Recorder()
export const player = new Player()
d.recorder = recorder
d.player = player
