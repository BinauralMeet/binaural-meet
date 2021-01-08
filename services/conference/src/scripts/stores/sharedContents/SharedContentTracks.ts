//  import {connection} from '@models/api'
import {connection} from '@models/api'
import {ConnectionForContent} from '@models/api/ConnectionForScreenContent'
import {SharedContent} from '@models/SharedContent'
import {assert} from '@models/utils'
import participants from '@stores/participants/Participants'
import {SharedContents} from '@stores/sharedContents/SharedContents'
import {JitsiLocalTrack, JitsiRemoteTrack, JitsiTrack} from 'lib-jitsi-meet'
import _ from 'lodash'
import {action, computed, observable} from 'mobx'

export const CID_MAINSCREEN = 'mainScreen'
export class SharedContentTracks {
  private sharedContents:SharedContents
  constructor(sharedContents: SharedContents) {
    this.sharedContents = sharedContents
  }
  //  Map<pid (of content carrier), cid / screen map>
  public carrierMap = new Map<string, string>()

  //  remote tracks whose content or screen is not received yet.
  remoteTrackPool = new Map<string, Set<JitsiRemoteTrack>>()
  // -----------------------------------------------------------------
  //  Public interface
  public onUpdateContent(c: SharedContent) {
    console.log(`update SC: id:${c.id} pid:${c.url} cid in map:${this.carrierMap.get(c.url)}`)
    assert(!this.carrierMap.has(c.url) || this.carrierMap.get(c.url) === c.id)
    this.carrierMap.set(c.url, c.id)
    const tracks = this.remoteTrackPool.get(c.url)
    this.remoteTrackPool.delete(c.url)
    tracks?.forEach((track) => {
      this.addRemoteContent(track)
    })
  }

  public addRemoteTrack(track: JitsiRemoteTrack) {
    const pid = track.getParticipantId()
    const cid = this.carrierMap.get(pid)

    if (!cid) {
      let pool = this.remoteTrackPool.get(pid)
      if (!pool) {
        pool = new Set<JitsiRemoteTrack>()
        this.remoteTrackPool.set(pid, pool)
      }
      pool.add(track)
    }else if (cid === CID_MAINSCREEN) {
      this.addRemoteMain(track)
    }else {
      if (this.sharedContents.localParticipant.myContents.has(cid)) {
        console.log(`SC addRT:Local: cid:${cid} pid:${track.getParticipantId()} track:${track.toString()}`)
      }else {
        console.log(`SC addRT:cid:${cid} pid:${track.getParticipantId()} track:${track.toString()}`)
        this.addRemoteContent(track)
      }
    }
  }
  public removeRemoteTrack(track: JitsiRemoteTrack) {
    const pid = track.getParticipantId()
    const cid = this.carrierMap.get(pid)
    if (cid) {
      this.removeRemoteContent(track)
    }else {
      this.removeRemoteMain(track)
    }
  }
  public onMainScreenCarrier(carrierId: string, enable: boolean) {
    if (enable) {
      this.carrierMap.set(carrierId, CID_MAINSCREEN)
      const tracks = this.remoteTrackPool.get(carrierId)
      tracks?.forEach(track => this.addRemoteMain(track))
      this.remoteTrackPool.delete(carrierId)
    }else {
      this.remoteMains.delete(carrierId)
      this.carrierMap.delete(carrierId)
    }
  }

  // -----------------------------------------------------------------
  //  Tracks for the MainScreen
  localMainConnection?:ConnectionForContent = undefined
  @observable.shallow localMains: Set<JitsiLocalTrack> = new Set()
  @action public addLocalMains(tracks: JitsiLocalTrack[]) {
    assert(tracks.length)
    if (!tracks.find(track => this.localMains.has(track))) {
      //  add tracks to localMainConnection
      tracks.forEach(track => this.localMains.add(track))
      if (!this.localMainConnection) {
        this.localMainConnection = new ConnectionForContent
        this.localMainConnection.init().then(() => {
          connection.conference.sync.sendMainScreenCarrier('', true)
          tracks.forEach(track => this.localMainConnection!.addTrack(track))
        })
      }else {
        tracks.forEach(track => this.localMainConnection!.addTrack(track))
      }
      //  set onended
      tracks.forEach(track => track.getTrack().onended = () => {
        console.log('stop sharing screen of ', track)
        this.removeLocalMain(track)
      })
    }else {
      console.error(`addLocalMain: one of track in ${tracks} already in localMains.`)
    }
  }
  @action public removeLocalMain(track: JitsiLocalTrack) {
    if (!this.localMains.delete(track)) {
      console.error(`removeLocalMain: track ${track} not found in localMains.`)

      return
    }
    connection.conference.sync.sendMainScreenCarrier('', false)
    this.localMainConnection!.removeTrack(track).then(() => {
      if (this.localMainConnection!.getLocalTracks().length === 0) {
        this.localMainConnection!.disconnect()
        this.localMainConnection = undefined
      }
    })
  }
  @action public clearLocalMains() {
    const mains = new Set(this.localMains)
    for (const track of mains) {
      this.removeLocalMain(track)
    }
  }
  //  Map of participantId->track for main screen from remotes
  @observable remoteMains: Map<string, Set<JitsiRemoteTrack>> = new Map()

  @computed get mainStream(): MediaStream|undefined {
    let tracks:JitsiTrack[] = []
    if (this.localMains.size) {
      tracks = Array.from(this.localMains.values()).filter(track => track.getType() !== 'audio')
    } else {
      const keys = Array.from(this.remoteMains.keys())
      if (keys.length) {
        keys.sort()
        const tracks_ = this.remoteMains.get(keys[keys.length - 1])
        if (tracks_) { tracks =  Array.from(tracks_.values()) }
      }
    }
    if (tracks.length) {
      const stream = new MediaStream()
      for (const track of tracks) {
        stream.addTrack(track.getTrack())
      }

      return stream
    }

    return undefined
  }

  @action private addRemoteMain(track: JitsiRemoteTrack) {
    const caRemote = track.getParticipantId()
    const caLocal = this.localMainConnection?.getParticipantId()
    if (caRemote > (caLocal ? caLocal : '')) {
      //  remote carrierId is larger and I have to stop screen shareing
      this.clearLocalMains()
    }

    if (!this.remoteMains.has(track.getParticipantId())) {
      this.remoteMains.set(track.getParticipantId(), new Set())
    }
    this.remoteMains.get(track.getParticipantId())?.add(track)
  }
  @action private removeRemoteMain(track: JitsiRemoteTrack) {
    this.remoteMains.get(track.getParticipantId())?.delete(track)
    if (this.remoteMains.get(track.getParticipantId())?.size === 0) {
      this.remoteMains.delete(track.getParticipantId())
    }
  }

  // -----------------------------------------------------------------
  //  Tracks for contents   contentId - tracks
  @observable localContents: Map<string, Set<JitsiLocalTrack>> = new Map()
  contentsConnection: Map<string, ConnectionForContent> = new Map()
  @action addLocalContents(cid:string, tracks: JitsiLocalTrack[]) {
    assert(tracks.length)
    const trackSet = new Set(this.localContents.get(cid))
    tracks.forEach(track => trackSet!.add(track))
    assert(!this.localContents.has(cid))
    this.localContents.set(cid, trackSet)
    const conn = new ConnectionForContent()
    this.contentsConnection.set(cid, conn)
    conn.init().then(() => {
      this.carrierMap.set(conn.getParticipantId(), cid)
      const content = this.sharedContents.find(cid)
      assert(content)
      content.url = conn.getParticipantId()
      this.sharedContents.updateByLocal(Object.assign({}, content))
      tracks.forEach(track => conn.addTrack(track))
      tracks[0].getTrack().onended = (ev) => {
        this.sharedContents.removeByLocal(cid)
      }
    })
  }
  @action clearLocalContent(cid: string) {
    const tracks = this.localContents.get(cid)
    tracks?.forEach((track) => {
      track.getTrack().onended = null
      track.stopStream()
    })
    if (tracks) {
      const conn = this.contentsConnection.get(cid)
      assert(conn)
      this.carrierMap.delete(conn.getParticipantId())
      tracks.forEach(track => conn.removeTrack(track).then(() => {
        if (conn.getLocalTracks().length === 0) { conn.disconnect() }
      }))
    }
    this.localContents.delete(cid)
    this.contentsConnection.delete(cid)
  }
  //  Map of contentId -> track for content tracks from remotes
  @observable remoteContents: Map<string, Set<JitsiRemoteTrack>> = new Map()
  @action private addRemoteContent(track: JitsiRemoteTrack) {
    const cid = this.carrierMap.get(track.getParticipantId())
    if (cid) {
      const trackSet = this.remoteContents.get(cid)
      const newTrackSet = new Set<JitsiRemoteTrack>(trackSet)
      newTrackSet.add(track)
      this.remoteContents.set(cid, newTrackSet)
    }else {
      console.warn(`No cid found for carrier ${track.getParticipantId()} of track ${track.toString()}`)
    }
  }
  @action private removeRemoteContent(track: JitsiRemoteTrack) {
    const cid = this.carrierMap.get(track.getParticipantId())
    if (cid) {
      const trackSet = this.remoteContents.get(cid)
      trackSet?.delete(track)
      if (trackSet?.size === 0) {
        this.remoteContents.delete(cid)
      }
    }else {
      console.warn(`No cid found for carrier ${track.getParticipantId()} of track ${track.toString()}`)
    }
  }
  @action clearRemoteContent(cid: string) {
    const content = this.sharedContents.find(cid)
    if (content && content.url) {
      this.carrierMap.delete(content.url)
      this.remoteContents.delete(cid)
    }else {
      console.warn(`No pid found for content ${cid}`)
    }
  }

  //  utility
  remoteMainTrack(): (JitsiRemoteTrack|undefined)[] | undefined {
    if (this.localMains.size === 0) {
      const keys = Array.from(this.remoteMains.keys())
      if (keys.length) {
        keys.sort()
        const trackSet = this.remoteMains.get(keys[keys.length - 1])
        if (trackSet) {
          const tracks = Array.from(trackSet)

          return [tracks.find(track => track.isVideoTrack()), tracks.find(track => track.isAudioTrack())]
        }
      }
    }

    return undefined
  }
}
