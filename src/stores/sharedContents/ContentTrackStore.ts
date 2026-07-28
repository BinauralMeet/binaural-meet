import {TrackRoles, TrackKind} from '@models/conference/RtcConnection'
import {assert} from '@models/utils'
import {observable, makeObservable} from 'mobx'
import {ContentSyncTransport} from './ContentSyncTransport'

export interface PeerAndTracks {
  peer: string
  tracks: MediaStreamTrack[]
}

// RTC track bookkeeping for shared content (screen/camera tracks), split out
// of the former SharedContents god-class. Purely local track state -- no
// network protocol here, just which MediaStreamTracks belong to which content.
export class ContentTrackStore {
  // Injected once by Conference; see ContentSyncTransport.ts.
  private syncTransport?: ContentSyncTransport
  public setSyncTransport(transport: ContentSyncTransport) {
    this.syncTransport = transport
  }

  constructor() {
    makeObservable(this)
  }

  @observable.ref mainScreenStream?: MediaStream
  @observable mainScreenOwner: string | undefined
  @observable.deep contentTracks = new Map<string, PeerAndTracks>()  //  cid -> stream

  public getContentTracks(cid:string){ return this.contentTracks.get(cid) }
  public getContentTrack(cid:string, kind:TrackKind){
    const tracks = this.contentTracks.get(cid)?.tracks
    return tracks?.find(t => t.kind === kind)
  }
  public getOrCreateContentTracks(peer: string, cid: string): PeerAndTracks{
    if(!this.contentTracks.has(cid)){
      this.contentTracks.set(cid, {peer, tracks:[]})
    }
    const pat = this.contentTracks.get(cid)!
    if (peer){
      assert(!pat.peer || pat.peer === peer)
      pat.peer = peer
    }
    return pat
  }

  public addTrack(peer: string, role: TrackRoles, track: MediaStreamTrack){
    if (role === 'mainScreen'){
      const ms = new MediaStream()
      ms.addTrack(track)
      if (this.mainScreenOwner !== peer){
        this.mainScreenOwner = peer
        this.mainScreenStream = ms
      }else{
        this.mainScreenStream?.getTracks().forEach(track => {
          ms.addTrack(track)
        })
        this.mainScreenStream = ms
      }
    }else{
      const tracks = this.getOrCreateContentTracks(peer, role).tracks
      tracks.push(track)
    }
  }
  public removeTrack(peer: string, role: TrackRoles, kind?: TrackKind){
    if (role === 'mainScreen'){
      if (this.mainScreenOwner === peer){
        const ms = new MediaStream()
        if (kind){
          if (kind === 'audio'){
            this.mainScreenStream?.getVideoTracks().forEach(ms.addTrack)
          }else{
            this.mainScreenStream?.getAudioTracks().forEach(ms.addTrack)
          }
        }
        if (ms.getTracks().length){
          this.mainScreenStream = ms
        }else{
          this.mainScreenStream = undefined
        }
        this.mainScreenOwner = undefined
      }
    }else{
      const tracks = this.contentTracks.get(role)?.tracks
      if (tracks){
        if (kind){
          const i = tracks.findIndex(t=>t.kind === kind)
          if (i>=0){
            tracks[i].stop()
            tracks.splice(i, 1)
          }
        }else{
          tracks.forEach(track => {
            track.stop()
          })
          tracks.length = 0
        }
      }else{
        console.log(`removeRemoteTrack(): tracks for content ${role} not found.`)
      }
    }
  }
  public getAllRtcContentIds(){
    return Array.from(this.contentTracks.keys())
  }
  public getLocalRtcContentIds(){
    return Array.from(this.contentTracks.keys())
      .filter(cid=>this.contentTracks.get(cid)!.peer === this.syncTransport?.localPeer)
  }
  public getRemoteRtcContentIds(){
    return Array.from(this.contentTracks.keys())
      .filter(cid=>this.contentTracks.get(cid)!.peer !== this.syncTransport?.localPeer)
  }
}

const contentTrackStore = new ContentTrackStore()
export default contentTrackStore

declare const d:any                  //  from index.html
d.contentTrackStore = contentTrackStore
