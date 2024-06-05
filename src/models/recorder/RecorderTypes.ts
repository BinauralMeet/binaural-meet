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
