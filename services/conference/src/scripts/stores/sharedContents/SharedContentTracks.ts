import {connection} from '@models/api'
import {SharedContent as ISharedContent} from '@models/SharedContent'
import {assert} from '@models/utils'
import participants from '@stores/participants/Participants'
import {SharedContents} from '@stores/sharedContents/SharedContents'
import {JitsiLocalTrack, JitsiRemoteTrack, JitsiTrack} from 'lib-jitsi-meet'
import _ from 'lodash'
import {action, computed, observable} from 'mobx'

export class SharedContentTracks {
  private sharedContents:SharedContents
  constructor(sharedContents: SharedContents) {
    this.sharedContents = sharedContents
  }
  // -----------------------------------------------------------------
  //  Tracks for the MainScreen
  @observable.shallow localMains: Set<JitsiLocalTrack> = new Set()
  @action addLocalMains(tracks: JitsiLocalTrack[]) {
    assert(tracks.length)
    if (!tracks.find(track => this.localMains.has(track))) {
      connection.conference.addTracks(tracks)
      tracks.forEach(track => this.localMains.add(track))
      tracks.forEach(track => track.getTrack().onended = () => {
        console.log('stop sharing screen of ', track)
        if (this.localMains.delete(track)) {
          connection.conference.removeTrack(track)
        }
      })
    }else {
      console.error(`addLocalMain: one of track in ${tracks} already in localMains.`)
    }
  }
  @action removeLocalMain(track: JitsiLocalTrack) {
    if (!this.localMains.delete(track)) {
      console.error(`removeLocalMain: track ${track} not found in localMains.`)
    }else {
      connection.conference.removeTrack(track)
    }
  }
  @action clearLocalMains() {
    for (const track of this.localMains) {
      track.stopStream()
    }
    this.localMains = new Set()
  }
  //  Map of participantId->track for main screen from remotes
  @observable remoteMains: Map<string, Set<JitsiRemoteTrack>> = new Map()
  @observable.shallow mutedRemoteMains: Set<JitsiRemoteTrack> = new Set()

  @computed get mainStream(): MediaStream|undefined {
    let tracks:Set<JitsiTrack> = new Set()
    if (this.localMains.size) {
      tracks = this.localMains
    } else {
      const keys = Array.from(this.remoteMains.keys())
      if (keys.length) {
        keys.sort()
        const tracks_ = this.remoteMains.get(keys[keys.length - 1])
        if (tracks_) { tracks =  tracks_ }
      }
    }
    if (tracks.size) {
      let stream:MediaStream|undefined = undefined
      for (const track of tracks) {
        if (this.mutedRemoteMains.has(track as JitsiRemoteTrack)) { continue }
        if (!stream) {
          stream = track.getOriginalStream()
        } else if (track.getOriginalStream() !== stream) {
          stream = new MediaStream
          for (const t of tracks) { stream.addTrack(t.getTrack()) }
          break
        }
      }

      return stream
    }

    return undefined
  }

  @action addRemoteMain(track: JitsiRemoteTrack) {
    const pid = track.getParticipantId()
    if (pid > participants.localId) {
        //  remote pid is larger and I have to stop screen shareing
      this.localMains.forEach((track) => { track.getTrack().stop() })
    }

    if (!track.videoType) {
      console.log('addRemoteMainScreenTrack: track should have videoType', track)

      return
    }
    //  console.log(`${track} videoType:${(track as any).videoType} added`)
    track.getTrack().onmute = () => { this.mutedRemoteMains.add(track) }
    track.getTrack().onunmute = () => { this.mutedRemoteMains.delete(track) }
    if (!this.remoteMains.has(track.videoType)) {
      this.remoteMains.set(track.getParticipantId(), new Set())
    }
    this.remoteMains.get(track.getParticipantId())?.add(track)
  }
  @action removeRemoteMain(track: JitsiRemoteTrack) {
    if (!track.videoType) {
      console.log('addRemoteMainScreenTrack: track should have videoType', track)

      return
    }
    this.remoteMains.get(track.getParticipantId())?.delete(track)
    if (this.remoteMains.get(track.getParticipantId())?.size === 0) {
      this.remoteMains.delete(track.getParticipantId())
    }
  }

  // -----------------------------------------------------------------
  //  Tracks for contents   contentId - tracks
  @observable localContents: Map<string, Set<JitsiLocalTrack>> = new Map()
  @action addLocalContents(tracks: JitsiLocalTrack[]) {
    assert(tracks.length)
    if (tracks[0].videoType) {
      const cid = tracks[0].videoType
      const trackSet = new Set(this.localContents.get(cid))
      tracks.forEach(track => trackSet!.add(track))
      this.localContents.set(cid, trackSet)
      connection.conference.addTracks(Array.from(tracks))
      tracks[0].getTrack().onended = (ev) => {
        this.sharedContents.removeContents(participants.localId, [cid])
      }
    }else {
      console.error('addLocals with no videoType', tracks)
    }
  }
  @action removeLocalContent(track: JitsiLocalTrack) {
    if (!track.videoType) {
      console.error('addLocalContentTrack no videoType', track)

      return
    }
    const trackSet = this.localContents.get(track.videoType)
    trackSet?.delete(track)
  }
  @action clearLocalContent(cid: string) {
    const tracks = this.localContents.get(cid)
    tracks?.forEach((track) => {
      track.getTrack().onended = null
      track.stopStream()
    })
    if (tracks) {
      connection.conference.removeTracks(Array.from(tracks))
    }
    this.localContents.delete(cid)
  }
  //  Map of participantId->track for content tracks from remotes
  @observable remoteContents: Map<string, Set<JitsiRemoteTrack>> = new Map()
  @action addRemoteContent(track: JitsiRemoteTrack) {
    if (!track.videoType) {
      console.error('addRemoteContentTrack no videoType', track)

      return
    }
    if (!this.remoteContents.has(track.videoType)) {
      this.remoteContents.set(track.videoType, new Set())
    }
    const trackSet = this.remoteContents.get(track.videoType)
    trackSet?.add(track)
  }
  @action removeRemoteContent(track: JitsiRemoteTrack) {
    if (!track.videoType) {
      console.error('addRemoteContentTrack no videoType', track)

      return
    }
    const trackSet = this.remoteContents.get(track.videoType)
    trackSet?.delete(track)
    if (trackSet?.size === 0) {
      this.remoteContents.delete(track.videoType)
    }
  }
  @action clearRemoteContent(cid: string) {
    this.remoteContents.delete(cid)
  }

  //  utility
  remoteMainTrack(): (JitsiRemoteTrack|undefined)[] | undefined {
    if (this.localMains.size == 0) {
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
