import {contentsToSend, ISharedContent, ISharedContentToSend} from '@models/ISharedContent'
import {ParticipantBase, RemoteInformation, Viewpoint, VRMRigs} from '@models/Participant'
import {assert, diffSet, mouse2Str, pose2Str, str2Mouse, str2Pose} from '@models/utils'
import {LocalParticipant} from '@stores/participants/LocalParticipant'
import {TrackStates} from '@stores/participants/ParticipantBase'
import {RemoteParticipant} from '@stores/participants/RemoteParticipant'
import {autorun, computed, IReactionDisposer, makeObservable, observable} from 'mobx'
import {BMMessage} from './DataMessage'
import {MessageType} from './DataMessageType'
import {Dexie, IndexableType, Table} from 'dexie'
import { conference } from './Conference'
import { dateTimeString } from '@models/utils/date'
import { MediaClip } from '@stores/MapObject'
import participants from '@stores/participants/Participants'
import contents from '@stores/sharedContents/SharedContents'
declare const d:any                  //  from index.html

const REC_LOG = false
const recLog = REC_LOG ? console.log : (..._:any)=>{}

const recorderDb = new Dexie('recorderDb');
recorderDb.version(1).stores({
  records: '++id, title, room, duration, time',
  recMessages: '++id',
  recMedias: 'id',
  blobs: '++id'
});

type MediaRole = 'mic' | 'avatar' | 'camera' | 'screen'
type MediaKind = 'audio' | 'video' | 'invalid'
type BlobKind = MediaKind | 'json'

export const dbRecords = (recorderDb as any).records as Table
export const dbMediaRecs = (recorderDb as any).recMedias as Table
export const dbMessageRecs = (recorderDb as any).recMessages as Table
export const dbBlobs = (recorderDb as any).blobs as Table
export interface DBRecord{
  id?: number
  room: string
  time: number
  duration: number
  title: string
  blob?: Blob      //  archived blob includes all
}
export interface DBBlob{
  id?: number
  blob: Blob
}
export interface DBMediaRec extends MediaRecBase{
  blobs: number[]   //  blob in DBBlob
}

export interface MediaRecBase{
  id: string
  pid?: string
  cid?: string
  role: MediaRole
  kind: MediaKind
  startTime:number
  endTime:number
}
export interface MediaRecData extends MediaRecBase{
  blobs: Blob[]
}
class MediaRec implements MediaRecData{
  private media: MediaRecorder
  get stream(){ return this.media.stream }
  get state(){ return this.media.state }
  id: string
  pid?: string
  cid?: string
  role: MediaRole
  kind: MediaKind
  startTime = 0
  endTime = 0
  blobs: Blob[] = []
  onData: (media:MediaRec)=>void = ()=>{}
  constructor(stream: MediaStream, role:MediaRole, kind:MediaKind, id:string, opt?: {cid?:string, pid?: string}){
    this.id = id
    this.role = role
    this.pid = opt?.pid
    this.cid = opt?.cid
    this.kind = kind
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
  requestData(){
    if (this.media.state !== 'inactive'){
      this.media.requestData()
    }
  }
  private onStop(){
    this.endTime = Date.now()
  }
  private onDataAvailable(ev: BlobEvent){
    const blob = ev.data
    this.blobs.push(blob)
    //  recLog(`p:${this.pid} c:${this.cid} role:${this.role} blob type:${blob.type} size:${blob.size}`)
    //  + `url:${window.URL.createObjectURL(blob)}`)
    this.onData(this)
  }
}
export interface BlobHeader{
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
export interface DBRecMessage{
  id?: number
  messages: Message[]
  length: number
}

interface JSONPart{
  startTime: number
  endTime: number
  messages: Message[]
}
export class Recorder{
  recordingMedias = new Map<string, MediaRec>()

  messages: Message[] = []
  @observable recording = false
  startTime = 0
  endTime = 0

  private intervalTimer=0
  private stoppedMedias: MediaRec[] = []
  private disposers:IReactionDisposer[] = []
  private MessageTypesToRecord = new Set<string>([
    MessageType.PARTICIPANT_INFO, MessageType.PARTICIPANT_POSE, MessageType.PARTICIPANT_MOUSE,
    MessageType.PARTICIPANT_AFK, MessageType.PARTICIPANT_TRACKSTATES, MessageType.PARTICIPANT_VIEWPOINT,
    MessageType.PARTICIPANT_ON_STAGE, MessageType.CONTENT_UPDATE_REQUEST,
    MessageType.PARTICIPANT_LEFT,
    MessageType.CONTENT_REMOVE_REQUEST,
    MessageType.AUDIO_LEVEL
  ])
  private lastMessageValues= new Map<string, string>()

  constructor(){
    makeObservable(this)
  }
  public clear(){
    this.recordingMedias.clear()
    this.messages = []
    this.stoppedMedias = []
    this.startTime = 0
    this.endTime = 0
    this.lastMessageValues.clear()
  }

  ///  Start to record
  public start(){
    this.clear()
    //  start recording
    this.recording = true
    participants.local.recording = true


    this.startTime = Date.now()
    const dbRec: DBRecord = {
      room: conference.room,
      time: this.startTime,
      duration: 0,
      title: '',
      blob: undefined,
    }
    dbRecords.add(dbRec)
    //  list all track related to participants and contents
    this.disposers.push(autorun(()=>{
      this.observeAndRecordMedia()
    }))

    //  Record all contents
    const cs = contentsToSend(contents.all)
    this.messages.push({msg:{t:MessageType.CONTENT_UPDATE_REQUEST, v:JSON.stringify(cs)}, time: Date.now()})
    //  Record all participants
    const allParticipants:ParticipantBase[] = Array.from(participants.remote.values())
    allParticipants.unshift(participants.local)
    for(const p of allParticipants){
      this.messages.push(
        {msg:{t:MessageType.PARTICIPANT_INFO, p:p.id, v:JSON.stringify(p.information)}, time: Date.now()})
      this.messages.push(
        {msg:{t:MessageType.PARTICIPANT_POSE, p: p.id, v:JSON.stringify(pose2Str(p.pose))}, time: Date.now()})
      this.messages.push(
        {msg:{t:MessageType.PARTICIPANT_MOUSE, p: p.id, v:JSON.stringify(mouse2Str(p.mouse))}, time: Date.now()})
    }
    if (this.intervalTimer) window.clearInterval(this.intervalTimer)
    this.intervalTimer = window.setInterval(()=>{
      this.saveDiffToDB()
    }, 3 * 1000)
  }

  /// stop and save to db
  public stop(){
    //  Stop all recording media
    this.recordingMedias.forEach((_media, id) => this.stopMedia(id))
    assert(this.recordingMedias.size === 0)

    if (this.intervalTimer){
      window.clearInterval(this.intervalTimer)
      this.intervalTimer = 0
    }
    for(const d of this.disposers){ d() }
    this.disposers = []
    const promise = new Promise<DBRecord>((resolve, reject)=>{
      this.getMediaData().then((medias:MediaRec[])=>{
        this.endTime = Date.now()
        this.makeRecord(medias).then((dbr)=>{
          dbBlobs.clear().then(()=>{
            dbMediaRecs.clear().then(()=>{
              dbMessageRecs.clear().then(()=>resolve(dbr))
            })
          })
        }).catch(reject)
      })
    })

    return promise
  }

  //  called by DataConnection.ts
  public recordMessage(msg:BMMessage){
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

  //  incremental save to indexedDB
  private saveDiffToDB(){
    const promise = new Promise<void>((resolve)=>{
      const medias = Array.from(this.recordingMedias.values())
      let count = medias.length + 1
      const resolveAll = () => {
        count --
        if (count === 0){
          //recLog(`saveDiffToDB() ${medias.length} media, ${this.messages.length} msg`)
          resolve()
        }
      }
      this.saveMediaRecordings().then(()=>{
        for (const media of medias){
          dbMediaRecs.get(media.id).then((inDb)=>{
            const dbMedia:DBMediaRec = inDb ? inDb as DBMediaRec : {
              id: media.id,
              startTime: media.startTime,
              endTime: media.endTime,
              pid: media.pid,
              cid: media.cid,
              role: media.role,
              kind: media.kind,
              blobs: []
            }
            dbMedia.startTime = media.startTime
            dbMedia.endTime = media.endTime
            const blobsToAdd = media.blobs.slice(dbMedia.blobs.length)
            let addCount = 0
            for(const blob of blobsToAdd){
              const dbBlob:DBBlob = { blob }
              //  eslint-disable-next-line no-loop-func
              dbBlobs.add(dbBlob).then((blobId:IndexableType)=>{
                dbMedia.blobs.push(blobId as number)
                addCount++
                if (addCount === blobsToAdd.length){
                  dbMediaRecs.put(dbMedia, dbMedia.id).then(()=>{
                    resolveAll()
                  })
                }
              })
            }
          })
        }
      })
      dbMessageRecs.toArray().then((dbMsgs:DBRecMessage[])=>{
        const dbLen = dbMsgs.reduce((p,c) => p + c.length, 0)
        if (this.messages.length > dbLen){
          const messagesToAdd = this.messages.slice(dbLen)
          const dbMsgToAdd: DBRecMessage = {
            messages:messagesToAdd,
            length:messagesToAdd.length
          }
          dbMessageRecs.add(dbMsgToAdd).then(()=>{
            resolveAll()
          })
        }else{
          resolveAll()
        }
      })
    })
    return promise
  }

  private converting = false
  public convertDiffsToRecord(){
    let maxEndTime = 0
    const promise = new Promise<DBRecord>((resolve, reject)=>{
      if (recorder.recording || this.converting) { reject(); return }
      this.converting = true
      dbRecords.where({title:''}).count(nRecord => {
        if (nRecord === 0){ reject(); return}
        //  recLog(`convert start nRecord=${nRecord}`)
        dbMessageRecs.toArray((dbMsgs:DBRecMessage[])=>{
          dbMediaRecs.toArray((dbMedias:DBMediaRec[])=>{
            const medias: MediaRecData[] = []
            if (dbMsgs.length || dbMedias.length){
              this.messages = []
              let count = 1
              const resolveAll = () => {
                count --
                if (count === 0){
                  dbMessageRecs.clear().then(()=>{
                    dbMediaRecs.clear().then(()=>{
                      dbBlobs.clear().then(()=>{
                        this.endTime = maxEndTime
                        this.makeRecord(medias, true).then((dbRec)=>{
                          this.converting = false
                          resolve(dbRec)
                        }).catch(reject)
                      })
                    })
                  })
                }
              }
              for(const msg of dbMsgs){
                for(const m of msg.messages){
                  maxEndTime = Math.max(m.time, maxEndTime)
                }
                this.messages.push(...msg.messages)
              }
              for(const m of dbMedias){
                maxEndTime = Math.max(m.endTime, m.startTime, maxEndTime)
                const blobs:(Blob)[] = Array(m.blobs.length)
                count += blobs.length
                const media:MediaRecData = {
                  id:m.id,
                  pid:m.pid,
                  cid:m.cid,
                  role:m.role,
                  kind:m.kind,
                  startTime:m.startTime,
                  endTime:m.endTime,
                  blobs,
                }
                medias.push(media)
                m.blobs.forEach((b, i)=>{
                  dbBlobs.get(b).then((b:DBBlob)=>{
                    blobs[i] = b.blob
                    resolveAll()
                  })
                })
              }
              resolveAll()
            }else{
              reject()
            }
          })
        })

      })
    })
    return promise
  }

  private getMediaData(){
    assert(this.recordingMedias.size === 0)
    this.recording = false
    participants.local.recording = false
    let count = 0
    const promise = new Promise<MediaRec[]>((resolve, reject)=>{
      const resolveAll = ()=>{
        count ++
        if (count === medias.length){
          resolve(medias)
        }
      }
      const medias = this.stoppedMedias
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

  private makeRecord(medias: MediaRecData[], useDbData?: boolean){
    const promise = new Promise<DBRecord>((resolve, reject) => {
      dbRecords.where({title:''}).toArray().then((records)=>{
        if (records.length){
          const record = records.pop()
          if (useDbData) this.startTime = record.time
          const room = useDbData ? record.room : conference.room
          const blob = this.makeBlob(medias)
          const saveRecord:DBRecord = {
            id: record.id,
            room,
            time: this.startTime,
            duration: this.endTime - this.startTime,
            title: `BMR_${room}_${dateTimeString(this.startTime)}`,
            blob
          }

          let count = records.length + 1
          const resolveAll = ()=>{
            count--
            if (count === 0){
              resolve(saveRecord)
            }
          }

          for(const r of records) {
            dbRecords.delete(r.id).then(resolveAll)
          }
          dbRecords.put(saveRecord, saveRecord.id).then(()=>{
            resolveAll()
          }).catch(()=>{
            reject('Failed to add record to IndexedDB')
          })
        }else{
          const msg = 'The record created when starts to record not found in db.'
          console.error(msg)
          reject(msg)
        }
      })
    })
    return promise
  }
  private makeBlob(medias: MediaRecData[]){
    const blobs:Blob[] = []
    const headers:BlobHeader[] = []
    const jsonPart:JSONPart = {startTime:this.startTime, endTime: this.endTime, messages:this.messages}
    const blob = new Blob([JSON.stringify(jsonPart)], {type:'application/json'})
    const header:BlobHeader = {role:'message', size:blob.size, kind:'json'}
    blobs.push(blob)
    headers.push(header)
    for(const m of medias){
      if (m.blobs.length){
        const blob = new Blob(m.blobs)
        const header:BlobHeader = {
          pid:m.pid, cid: m.cid, role:m.role, size:blob.size, kind:m.kind,
          time: m.startTime, duration: m.endTime - m.startTime}
        if (blob.size){
          blobs.push(blob)
          headers.push(header)
        }
      }
    }

    blobs.unshift(new Blob([JSON.stringify(headers)], {type:'application/json'}))
    const headerLen = new Uint32Array(1)
    headerLen[0] = blobs[0].size
    blobs.unshift(new Blob([headerLen]))
    return new Blob(blobs, {type:'application/octet-stream'})
  }
  private saveMediaRecordings(){
    let count = 0
    const promise = new Promise<MediaRec[]>((resolve, reject)=>{
      const medias = Array.from(this.recordingMedias.values())
      function resolveAll(){
        count ++
        if (count === medias.length){
          resolve(medias)
        }
      }
      if (medias.length){
        for(const media of medias) {
          if (media.state === 'inactive'){
            resolveAll()
          }else{
            media.onData = () => {
              media.onData = ()=>{}
              media.endTime = Date.now()
              resolveAll()
            }
            media.requestData()
          }
        }
      }else{
        resolve(medias)
      }
    })
    return promise
  }

  private startMedia(stream:MediaStream, role:MediaRole, kind:MediaKind, id: string, opt?: {cid?:string, pid?: string}){
    if (!this.recordingMedias.has(id)){
      const media = new MediaRec(stream, role, kind, id, opt)
      this.recordingMedias.set(id, media)
      media.start()
      recLog(`Rec for ${id}: ${JSON.stringify(media)}`)
    }
  }
  private stopMedia(id: string){
    const media = this.recordingMedias.get(id)
    if (media){
      media.stop()
      this.stoppedMedias.push(media)
      this.recordingMedias.delete(media.id)
    }
  }


  private observeAndRecordMedia(){
//  Participants
    const all:(RemoteParticipant|LocalParticipant)[] = Array.from(participants.remote.values())
    all.push(participants.local)
    for(const p of all){
      const vid = `pv_${p.id}`
      if (p.tracks.avatarStream){
        this.startMedia(p.tracks.avatarStream, 'avatar', 'video', vid, {pid:p.id})
      }else{
        this.stopMedia(vid)
      }
      const aid = `pa_${p.id}`
      if (p.tracks.audioStream){
        this.startMedia(p.tracks.audioStream, 'avatar', 'audio', aid, {pid:p.id})
      }else{
        this.stopMedia(aid)
      }
    }
    //  Contents
    const rtcContents = contents.getAllRtcContentIds()
    for (const rcid of rtcContents){
      const c = contents.find(rcid)
      if (c && (c.type === 'screen' || c.type === 'camera')){
        const tracks = contents.contentTracks.get(rcid)!.tracks
        for(const track of tracks){
          let id
          if (track.kind === 'audio'){
            id = `ca_${c.id}`
          }else{
            id = `cv_${c.id}`
          }
          this.startMedia(new MediaStream([track]), c.type, track.kind as MediaKind, id, {cid:c.id})
        }
      }
    }
  }
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
  private rate = 1.0
  private playInterval = 0
  private pids = new Set<string>()
  private cids = new Set<string>()
  private pidsPlaying = new Set<string>()
  private cidsPlaying = new Set<string>()
  private mediasPlaying:MediaPlay[] = []
  constructor(){
    makeObservable(this)
  }

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
          //  recLog(JSON.stringify(headers))
          for(const header of headers){
            if (header.role === 'message'){
              //  eslint-disable-next-line no-loop-func
              archive.slice(start, start+header.size).text().then(text => {
                const jsonPart = JSON.parse(text) as JSONPart
                this.messages = jsonPart.messages
                this.currentTime_ = this.startTime = jsonPart.startTime
                this.endTime = jsonPart.endTime
                count ++
                if (count === headers.length){ resolve(this) }
              })
            }else{
              //  eslint-disable-next-line no-loop-func
              archive.slice(start, start+header.size).arrayBuffer().then(ab => {
                const blob = new Blob([ab])
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
  seek(offset: number){
    const messages = Array.from(this.messages)
    const medias = Array.from(this.medias)
    messages.sort((a,b) => a.time - b.time)
    medias.sort((a,b) => a.time - b.time)
    this.currentTime_ = this.startTime + offset
    //recLog(`seek ct=${this.currentTime}`)
    //let time = this.startTime + offset
    const ffTo = messages.findIndex(m=>m.time >= this.currentTime) - 1
    if (ffTo > 0){  //  first forward to ffTo
      const ffMsgs = messages.splice(0, ffTo)
      this.fastForwardMessage(ffMsgs, this.currentTime)
    }
    //  Play medias playing at currentTime
    this.pidsPlaying.clear()
    this.cidsPlaying.clear()
    const mediasNotPlayed:MediaPlay[] = []  //  Medias too early or too late for current time.
    while (medias.length && medias[0].time < this.currentTime){
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
    this.rate = rate
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

    const timeDiff = Date.now() - (this.currentTime)
    const step = () => {
      this.currentTime_ = Date.now() - timeDiff
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
        if (this.playInterval){
          window.clearInterval(this.playInterval)
          this.playInterval = 0
        }
        this.state_ = 'pause'
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
    console.log(`${pause? 'Pause' : 'Play'} pids: ${JSON.stringify(Array.from(this.pidsPlaying.values()))}`)
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

  private fastForwardMessage(messages: Message[], timeToFF:number){
    const participantMessages = new Map<string, Map<string, Message>>
    const contentMessages = new Map<string, Message>
    const ff = Array.from(messages)
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
        const cids = JSON.parse(m.msg.v) as string[]
        for(const cid of cids){
          contentMessages.delete(cid)
        }
      }else if (m.msg.p){
        if (m.msg.t === MessageType.PARTICIPANT_LEFT){
          const pidsLeft = JSON.parse(m.msg.v) as string[]
          for(const pid of pidsLeft){
            participantMessages.delete(pid)
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
          case MessageType.PARTICIPANT_VRMRIG: p.vrmRigs = v as VRMRigs; break
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

export const recorder = new Recorder()
export const player = new Player()
d.recorder = recorder
d.player = player
