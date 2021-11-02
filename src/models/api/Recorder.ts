import {Stores} from '@components/utils'
import {Connection} from '@models/api/Connection'
import {ParticipantBase, RemoteInformation} from '@models/Participant'
import {mouse2Str, pose2Str, str2Mouse, str2Pose} from '@models/utils'
import { LocalParticipant } from '@stores/participants/LocalParticipant'
import participants from '@stores/participants/Participants'
import { RemoteParticipant } from '@stores/participants/RemoteParticipant'
import {extractContentDataAndIds } from '@stores/sharedContents/SharedContentCreator'
import contents from '@stores/sharedContents/SharedContents'
import {BMMessage} from './BMMessage'
import { MessageType } from './MessageType'

declare const d:any                  //  from index.html

type StreamRole = 'mic' | 'avatar' | 'camera' | 'screen'

class MediaRec{
  startTime = 0
  media: MediaRecorder
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
  }
  onDataAvailable(ev: BlobEvent){
    const blob = ev.data
    this.blobs.push(blob)
    console.log(`p:${this.pid} c:${this.cid} role:${this.role} blob type:${blob.type} size:${blob.size}`
    + `url:${window.URL.createObjectURL(blob)}`)
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
}
class Message{
  msg: BMMessage
  time: number
  constructor(msg: BMMessage, time?:number){
    this.msg = msg
    this.time = time ? time : Date.now()
  }
}

export class Recorder{
  medias: MediaRec[] = []
  messages: Message[] = []
  recording = false
  recordMessage(msg:BMMessage){
    if (this.recording){
      this.messages.push(new Message(msg))
    }
  }

  start(stores: Stores){
    this.recording = true
    this.makeMediaRecorders()
    for(const m of this.medias){
      m.media.start()
      m.startTime = Date.now()
    }
    const cs = extractContentDataAndIds(stores.contents.all)
    this.messages.push({msg:{t:MessageType.CONTENT_UPDATE_REQUEST, v:JSON.stringify(cs)}, time: Date.now()})
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
  stopMediaRecordings(){
    this.recording = false
    let count = 0
    const promise = new Promise<MediaRec[]>((resolve, reject)=>{
      if (this.medias.length){
        for(const media of this.medias) {
          // eslint-disable-next-line no-loop-func
          media.onData = () => {
            count ++
            if (count === this.medias.length){
              resolve(this.medias)
            }
          }
          media.media.stop()
        }
      }else{
        resolve(this.medias)
      }
    })

    return promise
  }
  stop(){
    const promise = new Promise<Blob>((resolve)=>{
      this.stopMediaRecordings().then((medias)=>{
        const blobs:Blob[] = []
        const headers:BlobHeader[] = []
        const blob = new Blob([JSON.stringify(this.messages)], {type:'application/json'})
        const header:BlobHeader = {role:'message', size:blob.size, type:blob.type}
        blobs.push(blob)
        headers.push(header)
        for(const m of medias){
          if (m.blobs.length){
            const blob = new Blob(m.blobs)
            const header:BlobHeader = {
              pid:m.pid, cid: m.cid, role:m.role, size:blob.size, type:m.blobs[0].type, time: m.startTime}
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

  makeMediaRecorders(){
    const all:(RemoteParticipant|LocalParticipant)[] = Array.from(participants.remote.values())
    all.push(participants.local)
    for(const p of all){
      if (p.tracks.avatarStream){
        this.medias.push(new MediaRec(p.tracks.avatarStream, 'avatar', {pid:p.id}))
      }
      if (p.tracks.audioStream){
        this.medias.push(new MediaRec(p.tracks.audioStream, 'mic', {pid:p.id}))
      }
    }
    const contentStreams = contents.tracks.allContentStreams()
    for (const cs of contentStreams){
      const c = contents.find(cs.cid)
      if (c && (c.type === 'screen' || c.type === 'camera')){
        this.medias.push(new MediaRec(cs.stream, c.type, {cid:c.id}))
      }else{
        console.error(`Failed to find content cid=${cs.cid}.`)
      }
    }
  }
}

class MediaPlay{
  blob: Blob
  time: number
  cid?:string
  pid?:string
  role:string
  constructor(blob: Blob, header:BlobHeader){
    this.blob = blob
    this.time = header.time!
    this.cid = header.cid
    this.pid = header.pid
    this.role = header.role
  }
}
class Player{
  messages: Message[] = []
  medias: MediaPlay[] = []
  load(archive: Blob){
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
          console.log(JSON.stringify(headers))
          for(const header of headers){
            if (header.role === 'message'){
              //  eslint-disable-next-line no-loop-func
              archive.slice(start, start+header.size).text().then(text => {
                this.messages = JSON.parse(text) as Message[]
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
  play(stores: Stores, connection: Connection){
    const messages = Array.from(this.messages)
    const medias = Array.from(this.medias)
    messages.sort((a,b) => a.time - b.time)
    medias.sort((a,b) => a.time - b.time)
    let time = this.messages.length && this.medias.length ? Math.min(this.messages[0].time, this.medias[0].time)
      : this.messages.length ? this.messages[0].time : this.medias[0].time
    function step(player: Player){
      while (messages.length && messages[0].time < time){
        const message = messages.shift()!
        player.playMessage(message.msg)
      }
      while (medias.length && medias[0].time < time){
        const media = medias.shift()!
        player.playMedia(media)
      }
      time += 30
      if (messages.length || medias.length){
        setTimeout(() => {step(player)}, 30)
      }
    }
    setTimeout(() => {step(this)}, 30)
  }
  playMedia(media:MediaPlay){
    console.log(`media:${media.blob.type}, pid:${media.pid}, cid:${media.pid}, role:${media.role}`)
    if (media.pid){
      const p = participants.getPlayback(media.pid)
      if (media.role === 'mic'){
        p.audioBlob = media.blob
      }else if (media.role === 'avatar'){
        p.videoBlob = media.blob
      }
    }
  }
  playMessage(msg: BMMessage){
    //console.log(`playMessage(${JSON.stringify(msg)})`)
    switch(msg.t){
      case MessageType.PARTICIPANT_INFO:
        if (msg.p){
          const p = participants.getPlayback(msg.p)
          p.information = JSON.parse(msg.v) as RemoteInformation
        }
        break
      case MessageType.PARTICIPANT_POSE:
        if (msg.p){
          const p = participants.getPlayback(msg.p)
          p.pose = str2Pose(JSON.parse(msg.v) as string)
        }
        break
      case MessageType.PARTICIPANT_MOUSE:
        if (msg.p){
          const p = participants.getPlayback(msg.p)
          p.mouse = str2Mouse(JSON.parse(msg.v) as string)
        }
        break
      default:
        break
    }
  }
}

export const recorder = new Recorder()
export const player = new Player()
d.recorder = recorder
d.player = player
