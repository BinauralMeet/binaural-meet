import {contentsToSend} from '@models/ISharedContent'
import {ParticipantBase} from '@models/Participant'
import {assert, mouse2Str, pose2Str} from '@models/utils'
import {LocalParticipant} from '@stores/participants/LocalParticipant'
import {RemoteParticipant} from '@stores/participants/RemoteParticipant'
import {autorun, IReactionDisposer, makeObservable, observable} from 'mobx'
import {BMMessage} from '@models/conference/DataMessage'
import {MessageType} from '@models/conference/DataMessageType'
import {Dexie, IndexableType, Table} from 'dexie'
import { conference } from '@models/conference/Conference'
import { dateTimeString } from '@models/utils/date'
import participants from '@stores/participants/Participants'
import contents from '@stores/sharedContents/SharedContents'
import {MediaRecData, MediaRole, MediaKind, BlobKind, recLog, DBRecord, DBMediaRec, DBBlob} from './RecorderTypes'
declare const d:any                  //  from index.html

const recorderDb = new Dexie('recorderDb');
recorderDb.version(1).stores({
  records: '++id, title, room, duration, time',
  recMessages: '++id',
  recMedias: 'id',
  blobs: '++id'
});


export const dbRecords = (recorderDb as any).records as Table
export const dbMediaRecs = (recorderDb as any).recMedias as Table
export const dbMessageRecs = (recorderDb as any).recMessages as Table
export const dbBlobs = (recorderDb as any).blobs as Table
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
interface MessagesHeader{
  startTime: number
  endTime: number
  messages: Message[]
}
export interface RecordHeader{
  messages: MessagesHeader
  blobs: BlobHeader[]
}
const defaultRecordHeader:RecordHeader = {
  messages:{messages:[], startTime:0, endTime: 0},
  blobs:[]
}
export interface DBRecMessage{
  id?: number
  messages: Message[]
  length: number
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
    }, 30 * 1000)
  }

  /// stop and save to db
  public stop(){
    for(const d of this.disposers){ d() }
    this.disposers = []

    //  Stop all recording media
    this.recordingMedias.forEach((_media, id) => this.stopMedia(id))
    assert(this.recordingMedias.size === 0)

    if (this.intervalTimer){
      window.clearInterval(this.intervalTimer)
      this.intervalTimer = 0
    }

    const promise = new Promise<DBRecord>((resolve, reject)=>{
      this.getMediaData().then((medias:MediaRec[])=>{
        this.endTime = Date.now()
        console.log(`getMediaData.then: medias:${medias.length}`)

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
            console.log(`Meida ${media.id} p:${media.pid} c:${media.cid} remains and stop() called.`)
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
          console.log(`makeRecord: ms:${medias.length} recs:${records.length}`)
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
            dbRecords.delete(r.id).then(resolveAll).catch(()=>{
              reject('Failed to delete record from IndexedDB')
            })
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
    const msgsHeader:MessagesHeader = {startTime:this.startTime, endTime: this.endTime, messages:this.messages}
    const blob = new Blob([JSON.stringify(msgsHeader)], {type:'application/json'})
    const header:BlobHeader = {role:'message', size:blob.size, kind:'json'}
    const blobs:Blob[] = []
    const headers:BlobHeader[] = []
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

const recorder = new Recorder()
d.recorder = recorder
export default recorder