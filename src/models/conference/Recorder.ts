import {Stores} from '@components/utils'
import {contentsToSend, IPlaybackContent} from '@models/ISharedContent'
import {ParticipantBase, RemoteInformation, Viewpoint, VRMRigs} from '@models/Participant'
import {mouse2Str, pose2Str, str2Mouse, str2Pose} from '@models/utils'
import {LocalParticipant} from '@stores/participants/LocalParticipant'
import { TrackStates } from '@stores/participants/ParticipantBase'
import participants from '@stores/participants/Participants'
import {RemoteParticipant} from '@stores/participants/RemoteParticipant'
import contents from '@stores/sharedContents/SharedContents'
import {autorun, IReactionDisposer, makeObservable, observable} from 'mobx'
import {BMMessage} from './DataMessage'
import {MessageType} from './DataMessageType'
import {Dexie, IndexableType, Table} from 'dexie'
import { conference } from './Conference'
import { dateTimeString } from '@models/utils/date'
declare const d:any                  //  from index.html

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
    //  console.log(`p:${this.pid} c:${this.cid} role:${this.role} blob type:${blob.type} size:${blob.size}`)
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
  medias = new Map<string, MediaRec>()
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
    MessageType.PARTICIPANT_ON_STAGE, MessageType.CONTENT_UPDATE_REQUEST, MessageType.CONTENT_REMOVE_REQUEST,
    MessageType.AUDIO_LEVEL
  ])
  private lastMessageValues= new Map<string, string>()

  constructor(){
    makeObservable(this)
  }
  public clear(){
    this.medias.clear()
    this.messages = []
    this.stoppedMedias = []
    this.startTime = 0
    this.endTime = 0
    this.lastMessageValues.clear()
  }
  ///  Start to record
  public start(stores: Stores){
    this.clear()
    //  start recording
    this.recording = true
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
    const cs = contentsToSend(stores.contents.all)
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
    if (this.intervalTimer) window.clearInterval(this.intervalTimer)
    this.intervalTimer = window.setInterval(()=>{
      this.saveDiffToDB()
    }, 3 * 1000)
  }

  /// stop and save to db
  public stop(){
    if (this.intervalTimer){
      window.clearInterval(this.intervalTimer)
      this.intervalTimer = 0
    }
    for(const d of this.disposers){ d() }
    this.disposers = []
    const promise = new Promise<DBRecord>((resolve, reject)=>{
      this.stopMediaRecordings().then((medias:MediaRec[])=>{
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
      const medias = Array.from(this.medias.values())
      let count = medias.length + 1
      const resolveAll = () => {
        count --
        if (count === 0){
          //console.log(`saveDiffToDB() ${medias.length} media, ${this.messages.length} msg`)
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
        //  console.log(`convert start nRecord=${nRecord}`)
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
      function resolveAll(){
        count ++
        if (count === medias.length){
          resolve(medias)
        }
      }
      const medias = Array.from(this.medias.values())
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

  private observeAndRecordMedia(){
    const remains = new Set(this.medias.keys()) //  medias which should be deleted
    //  Participants
    const all:(RemoteParticipant|LocalParticipant)[] = Array.from(participants.remote.values())
    all.push(participants.local)
    for(const p of all){
      const vid = `pv_${p.id}`
      remains.delete(vid)
      if (p.tracks.avatarStream){
        if (!this.medias.has(vid)){
          const media = new MediaRec(p.tracks.avatarStream, 'avatar', 'video', vid, {pid:p.id})
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
          const media = new MediaRec(p.tracks.audioStream, 'avatar', 'audio', aid, {pid:p.id})
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
          remains.delete(id)
          if (!this.medias.has(id)){
            const stream = new MediaStream([track])
            const media = new MediaRec(stream, c.type, track.kind as MediaKind, id, {cid:c.id})
            this.medias.set(id, media)
            media.start()
            console.log(`Rec for ${id}: ${JSON.stringify(media)}`)
          }
        }
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
  kind:MediaKind
  constructor(blob: Blob, header:BlobHeader){
    this.blob = blob
    this.time = header.time!
    this.duration = header.duration
    this.cid = header.cid
    this.pid = header.pid
    this.role = header.role
    if (header.kind === 'audio' || header.kind === 'video'){
      this.kind = header.kind
    }else{
      this.kind = 'invalid'
    }
    //console.log(`MediaPlay URL:${URL.createObjectURL(this.blob)} ${JSON.stringify(this)}`)
  }
}
class Player{
  messages: Message[] = []
  medias: MediaPlay[] = []
  startTime = 0
  endTime = 0
  @observable playing = false
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
  play(){
    this.playing = true
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
  stop(){
    player.endTime = 0
  }
  private pids = new Set<string>()
  private cids = new Set<string>()
  private cleanup(){
    this.playing = false
    this.pids.forEach(pid=>{
      participants.removePlayback(pid)
    })
    this.cids.forEach(cid=>{
      contents.removePlayback(cid)
    })
  }

  private stopMedia(media:MediaPlay){
    if (media.pid && media.role === 'avatar'){
      const pid = `p_${media.pid}`
      const p = participants.playback.get(pid)
      if (p){
        p.videoBlob = undefined
      }
    }
  }
  private playMedia(media:MediaPlay){
      //  console.log(`media:${media.blob.type}, pid:${media.pid}, cid:${media.pid}, role:${media.role}`)
    if (media.pid){
      const pid = `p_${media.pid}`
      this.pids.add(pid)
      const obj = participants.getOrCreatePlayback(pid)
      if (media.kind === 'audio'){
        obj.audioBlob = media.blob
      }else if (media.kind === 'video'){
        obj.videoBlob = media.blob
      }else{
        console.error(`Unknown media kind ${media.kind}`)
      }
    }else if (media.cid){
      const cid = `p_${media.cid}`
      this.cids.add(cid)
      const obj = contents.getOrCreatePlayback(cid)
      if (media.kind === 'audio'){
        obj.audioBlob = media.blob
      }else if (media.kind === 'video'){
        obj.videoBlob = media.blob
        obj.url = URL.createObjectURL(media.blob)
      }else{
        console.error(`Unknown media kind ${media.kind}`)
      }
      contents.updatePlayback(obj)
    }
  }
  private playMessage(msg: BMMessage){
    //console.log(`playMessage ${msg.t}`, msg)
    const pid = msg.p ? `p_${msg.p}` : ''
    if (pid){ this.pids.add(pid) }
    const p = pid ? participants.getOrCreatePlayback(pid) : undefined
    let notHandled = true
    const v = JSON.parse(msg.v)
    if (p){
      notHandled = false
      switch(msg.t){
        case MessageType.PARTICIPANT_INFO: p.information = v as RemoteInformation; break
        case MessageType.PARTICIPANT_POSE: p.pose = str2Pose(v as string); break
        case MessageType.PARTICIPANT_MOUSE: p.mouse = str2Mouse(v as string); break
        case MessageType.PARTICIPANT_AFK: p.physics.awayFromKeyboard = v as boolean; break
        case MessageType.PARTICIPANT_TRACKSTATES: Object.assign(p.trackStates, v as TrackStates); break
        case MessageType.PARTICIPANT_VIEWPOINT: Object.assign(p.viewpoint, v as Viewpoint); break
        case MessageType.PARTICIPANT_ON_STAGE: p.physics.onStage = v as boolean; break
        case MessageType.PARTICIPANT_VRMRIG: p.vrmRigs = v as VRMRigs; break
        default: notHandled = true; break
      }
    }
    if (notHandled){
      notHandled = false
      switch(msg.t){
        case MessageType.CONTENT_UPDATE_REQUEST: this.onContentUpdateRequest(msg); break
        case MessageType.CONTENT_REMOVE_REQUEST: this.onContentRemoveRequest(msg); break
        default: notHandled = true; break
      }
    }
    if (notHandled){
      console.warn(`Playback did not handle message:`, msg)
    }
  }
  private onContentUpdateRequest(msg: BMMessage){
    const cs = JSON.parse(msg.v) as IPlaybackContent[]
    for(const c of cs){
      //  console.log('CONTENT_UPDATE_REQUEST:', c)
      c.id = `p_${c.id}`
      const cur = contents.findPlayback(c.id)
      if (cur){
        c.audioBlob = cur.audioBlob
        c.videoBlob = cur.videoBlob
        c.url = cur.url
      }
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
    }
  }
}

export const recorder = new Recorder()
export const player = new Player()
d.recorder = recorder
d.player = player
