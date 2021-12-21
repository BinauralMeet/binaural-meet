import {PlaybackParticipant, RemoteParticipant} from '@models/Participant'
import {urlParameters} from '@models/url'
import {diffMap} from '@models/utils'
import participants from '@stores/participants/Participants'
import contents from '@stores/sharedContents/SharedContents'
import {JitsiRemoteTrack} from 'lib-jitsi-meet'
import {autorun} from 'mobx'
import {ConnectedGroup, ConnectedGroupForPlayback} from './ConnectedGroup'
import {StereoManager} from './StereoManager'
export class ConnectedManager {
  private readonly manager = new StereoManager()

  private readonly connectedGroups: {
    [key: string]: ConnectedGroup|ConnectedGroupForPlayback,
  } = {}

  private remotesMemo = new Map<string, RemoteParticipant>()
  private playbacksMemo = new Map<string, PlaybackParticipant>()
  private contentsMemo = new Map<string, Set<JitsiRemoteTrack>>()

  public setAudioOutput(deviceId: string) {
    this.manager.setAudioOutput(deviceId)
  }
  constructor() {
    if (urlParameters.testBot !== null) { return }

    autorun(this.onRemotesChange)
    autorun(this.onPlaybacksChange)
    autorun(this.onScreenContentsChange)
    autorun(
      () => {
        const muteSpeaker = participants.local.muteSpeaker || participants.local.physics.awayFromKeyboard
        this.manager.switchPlayMode(participants.local.useStereoAudio ? 'Context' : 'Element', muteSpeaker)
      },
    )
  }

  private onRemotesChange = () => {
    const newRemotes = new Map(participants.remote)
    const added = diffMap(newRemotes, this.remotesMemo)
    const removed = diffMap(this.remotesMemo, newRemotes)
    removed.forEach(this.removeRemote)
    added.forEach(this.addRemote)
    this.remotesMemo = newRemotes
    //  console.log('Update connectedGroups:', this.connectedGroups)
  }
  private onPlaybacksChange = () => {
    const newPlaybacks = new Map(participants.playback)
    const added = diffMap(newPlaybacks, this.playbacksMemo)
    const removed = diffMap(this.playbacksMemo, newPlaybacks)
    removed.forEach(this.removePlayback)
    added.forEach(this.addPlayback)
    this.playbacksMemo = newPlaybacks
    //  console.log('Update connectedGroups:', this.connectedGroups)
  }

  private onScreenContentsChange = () => {
    const newRemotes = new Map(contents.tracks.remoteContents)
    const added = diffMap(newRemotes, this.contentsMemo)
    const removed = diffMap(this.contentsMemo, newRemotes)
    removed.forEach(this.removeContent)
    added.forEach(this.addContent)
    this.contentsMemo = newRemotes
  }

  private removePlayback = (pp: PlaybackParticipant) => {
    const id = pp.id
    this.connectedGroups[id].dispose()
    delete this.connectedGroups[id]

    this.manager.removeSpeaker(id)
  }
  private addPlayback = (pp: PlaybackParticipant) => {
    const id = pp.id
    const group = this.manager.addPlayback(id)
    this.connectedGroups[id] = new ConnectedGroupForPlayback(participants.local_, pp, group)
  }

  private removeRemote = (rp: RemoteParticipant) => {
    const id = rp.id
    this.connectedGroups[id].dispose()
    delete this.connectedGroups[id]

    this.manager.removeSpeaker(id)
  }
  private addRemote = (remote: RemoteParticipant) => {
    const group = this.manager.addSpeaker(remote.id)
    this.connectedGroups[remote.id] = new ConnectedGroup(participants.local_, undefined, remote, group)
  }

  private removeContent = (tracks: Set<JitsiRemoteTrack>) => {
    const audioTrack = Array.from(tracks.values()).find(track => track.getType() === 'audio')

    if (audioTrack) {
      const carrierId = audioTrack.getParticipantId()
      if (carrierId) {
        this.connectedGroups[carrierId].dispose()
        delete this.connectedGroups[carrierId]

        this.manager.removeSpeaker(carrierId)
      }else {
        console.error('removeContent: track does not have content id.', audioTrack)
      }
    }
  }

  private addContent = (tracks: Set<JitsiRemoteTrack>) => {
    const audioTrack = Array.from(tracks.values()).find(track => track.getType() === 'audio')
    if (audioTrack) {
      const carrierId = audioTrack.getParticipantId()
      if (carrierId) {
        const group = this.manager.addSpeaker(carrierId)
        this.connectedGroups[carrierId] = new ConnectedGroup(participants.local_, audioTrack, undefined, group)
      }else {
        console.error('addContent: track does not have content id.', audioTrack)
      }
    }
  }
}
