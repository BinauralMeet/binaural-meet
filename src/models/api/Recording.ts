import {ParticipantBase} from '@models/Participant'
import participants from '@stores/participants/Participants'
import contents from '@stores/sharedContents/SharedContents'

declare const d:any                  //  from index.html

type StreamRole = 'mic' | 'avatar' | 'camera' | 'screen'

class Recorder{
  recorder: MediaRecorder
  pid?: string
  cid?: string
  role: StreamRole
  blobs: Blob[] = []
  onData: (recorder:Recorder)=>void = ()=>{}
  constructor(stream: MediaStream, role:StreamRole, opt?: {cid?:string, pid?: string}){
    this.role = role
    this.pid = opt?.pid
    this.cid = opt?.cid
    this.recorder = new MediaRecorder(stream)
    this.recorder.addEventListener('dataavailable', this.onDataAvailable.bind(this))
  }
  onDataAvailable(ev: BlobEvent){
    const blob = ev.data
    this.blobs.push(blob)
    console.log(`p:${this.pid} c:${this.cid} role:${this.role} blob type:${blob.type} size:${blob.size}`
    + `url:${window.URL.createObjectURL(blob)}`)
    this.onData(this)
  }
}
export interface RecordedBlobHeader{
  cid?: string
  pid?: string
  role: string
  size: number
  type: string
}

class Recording{
  recorders: Recorder[] = []
  start(){
    this.makeRecorders()
    this.recorders.forEach(r => {
      r.recorder.start()
    })
  }
  stop(){
    let count = 0
    const promise = new Promise<Recorder[]>((resolve, reject)=>{
      this.recorders.forEach(r => {
        r.onData = () => {
          count ++
          if (count === this.recorders.length){
            resolve(this.recorders)
          }
        }
        r.recorder.stop()
      })
    })

    return promise
  }
  makeRecorders(){
    const all:ParticipantBase[] = Array.from(participants.remote.values())
    all.push(participants.local)
    for(const p of all){
      if (p.tracks.avatarStream){
        this.recorders.push(new Recorder(p.tracks.avatarStream, 'avatar', {pid:p.id}))
      }
      if (p.tracks.audioStream){
        this.recorders.push(new Recorder(p.tracks.audioStream, 'mic', {pid:p.id}))
      }
    }
    const contentStreams = contents.tracks.allContentStreams()
    for (const cs of contentStreams){
      const c = contents.find(cs.cid)
      if (c && (c.type === 'screen' || c.type === 'camera')){
        this.recorders.push(new Recorder(cs.stream, c.type, {cid:c.id}))
      }else{
        console.error(`Failed to find content cid=${cs.cid}.`)
      }
    }
  }
}

export const recording = new Recording()
d.recording = recording
