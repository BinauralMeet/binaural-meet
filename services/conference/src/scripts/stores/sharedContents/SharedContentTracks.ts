import {connection} from '@models/api'
import participants from '@stores/participants/Participants'
import {assert} from '@models/utils'
import {JitsiLocalTrack, JitsiRemoteTrack, JitsiTrack} from 'lib-jitsi-meet'
import _ from 'lodash'
import {action, computed, observable} from 'mobx'

export class SharedContentTracks {
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
  @observable remoteMains: Map<string, Set<JitsiRemoteTrack>> = new Map()  //  participantId
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
  }

  // -----------------------------------------------------------------
  //  Tracks for contents   contentId - tracks
  @observable localContents: Map<string, Set<JitsiLocalTrack>> = new Map()
  @action addLocalContent(track: JitsiLocalTrack) {
    if (!track.videoType) {
      console.error('addLocalContentTrack no videoType', track)

      return
    }
    let trackSet = this.localContents.get(track.videoType)
    if (!trackSet) {
      trackSet = new Set()
      this.localContents.set(track.videoType, trackSet)
    }
    trackSet.add(track)
  }
  @action addLocalContents(tracks: JitsiLocalTrack[]) {
    assert(tracks.length)
    if (tracks[0].videoType) {
      let trackSet = this.localContents.get(tracks[0].videoType)
      if (!trackSet) {
        trackSet = new Set()
        this.localContents.set(tracks[0].videoType, trackSet)
      }
      tracks.forEach(track => trackSet!.add(track))
      connection.conference.addTracks(Array.from(tracks))
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
  }
}
