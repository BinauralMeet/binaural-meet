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

//  Timing constants for the record/playback subsystem, named and collected here rather than
//  scattered as inline literals across Recorder.ts/Player.ts/the recorder UI components.
export const RECORD_DB_FLUSH_INTERVAL_MS = 30 * 1000
export const PLAYBACK_TICK_MS = 30
export const SEEK_THROTTLE_MS = 500
export const PLAYBACK_RETRY_POLL_MS = 100

//  Playback-side participants/content are keyed by this prefix to keep them distinct from live
//  (non-playback) ids sharing the same underlying pid/cid.
const PLAYBACK_ID_PREFIX = 'p_'
export function toPlaybackId(id: string){
  return `${PLAYBACK_ID_PREFIX}${id}`
}

//  Given ascending-sorted times, returns the count of entries with time <= target -- i.e. how
//  many messages from the start of a sorted array should be included when fast-forwarding to
//  `target` (Player.ts's seek()). Extracted as a pure, isolable function after a bug where an
//  extra `- 1` dropped exactly the last qualifying message from every seek.
export function countUpTo(times: number[], target: number): number {
  for (let i = 0; i < times.length; i++) {
    if (times[i] > target) { return i }
  }
  return times.length
}
