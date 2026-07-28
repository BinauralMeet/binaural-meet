import {BMMessage} from '@models/conference/DataMessage'

export const REC_LOG = false
export const recLog = REC_LOG ? console.log : (..._:any)=>{}
export type MediaRole = 'mic' | 'avatar' | 'camera' | 'screen'
export type MediaKind = 'audio' | 'video' | 'invalid'
export type BlobKind = MediaKind | 'json'
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

//  Archive-format DTOs shared by Recorder (writer) and Player (reader) -- keep the two in sync,
//  since a recorded session's blob format is only ever produced by one side and consumed by the other.
export interface BlobHeader{
  cid?: string
  pid?: string
  role: string
  size: number
  kind: BlobKind
  time?: number
  duration?: number
}

export class Message{
  msg: BMMessage
  time: number
  constructor(msg: BMMessage, time?:number){
    this.msg = msg
    this.time = time ? time : Date.now()
  }
}
export class MessagesHeader{
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
