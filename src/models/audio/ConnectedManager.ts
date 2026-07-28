import { ISharedContent } from '@models/ISharedContent'
import {PlaybackParticipant, RemoteParticipant} from '@models/Participant'
import {RemoteObjectInfo} from '@models/conference/priorityTypes'
import {urlParameters} from '@models/url'
import {diffMap} from '@models/utils'
import participants from '@stores/participants/Participants'
import contentSyncService from '@stores/sharedContents/ContentSyncService'
import contentTrackStore from '@stores/sharedContents/ContentTrackStore'
import playbackStore from '@stores/sharedContents/PlaybackStore'
import {autorun} from 'mobx'
import {ConnectedGroup, ConnectedGroupForPlayback} from './ConnectedGroup'
import {StereoManager} from './StereoManager'
export class ConnectedManager {
  private readonly manager = new StereoManager()

  // Forwarded to StereoManager; see its setAudiosToConsumeAccessor comment.
  public setAudiosToConsumeAccessor(fn: () => RemoteObjectInfo[]) {
    this.manager.setAudiosToConsumeAccessor(fn)
  }

  private readonly connectedGroups: {
    [key: string]: ConnectedGroup|ConnectedGroupForPlayback,
  } = {}

  private remotesMemo = new Map<string, RemoteParticipant>()
  private playbacksMemo = new Map<string, PlaybackParticipant>()
  private contentsMemo = new Map<string, ISharedContent>()
  private playbackContentsMemo = new Map<string, ISharedContent>()

  public setAudioOutput(deviceId: string) {
    return this.manager.setAudioOutput(deviceId)
  }
  public getAudioOutput(){
    return this.manager.getAudioOutput()
  }
  public preparePlaybackOutput(){
    this.manager.preparePlaybackOutput()
  }
  constructor() {
    if (urlParameters.testBot !== null) { return }

    // Defer autorun registration by one microtask so that all ES modules
    // involved in circular dependencies finish initializing before the first
    // autorun fires (avoids a TDZ ReferenceError). Verified (2026-07-28) that
    // this is NOT about ContentSyncService/ErrorInfo/StereoManager importing
    // @models/conference anymore -- those cycles are gone (see
    // ContentSyncTransport.ts / ConferenceStatusTransport.ts / the injected
    // audiosToConsume accessor). It's a separate cycle: @components/App's tree
    // reaches the sharedContents stores (this module's own dependencies)
    // before they finish their own top-level evaluation, and that same chain
    // also reaches @models/audio (this class), so removing the defer makes
    // observables TDZ at construction time. Tracing and fixing that
    // component-tree-driven cycle is out of scope for this pass.
    queueMicrotask(() => {
      autorun(this.onRemotesChange)
      autorun(this.onPlaybacksChange)
      autorun(this.onPlaybackContentsChange)
      autorun(this.onScreenContentsChange)
      autorun(() => {
        const muteSpeaker = participants.local.muteSpeaker || participants.local.physics.awayFromKeyboard
        this.manager.switchPlayMode(participants.local.useStereoAudio ? 'Context' : 'Element', muteSpeaker)
      })
    })
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
  private onPlaybackContentsChange = () => {
    const newPlaybackContents = new Map(playbackStore.playbackContents)
    const added = diffMap(newPlaybackContents, this.playbackContentsMemo)
    const removed = diffMap(this.playbackContentsMemo, newPlaybackContents)
    removed.forEach(this.removePlayback)
    added.forEach(this.addPlaybackContent)
    this.playbackContentsMemo = newPlaybackContents
    //  console.log('Update connectedGroups:', this.connectedGroups)
  }

  private onScreenContentsChange = () => {
    const audioRemoteContents = contentTrackStore.getRemoteRtcContentIds().filter(cid => contentTrackStore.getContentTrack(cid, 'audio'))
    const newRemotes = new Map(audioRemoteContents.map(cid => [cid, contentSyncService.find(cid)!]))
    const added = diffMap(newRemotes, this.contentsMemo)
    const removed = diffMap(this.contentsMemo, newRemotes)
    removed.forEach(this.removeContent)
    added.forEach(this.addContent)
    this.contentsMemo = newRemotes
  }

  private removePlayback = (pp: PlaybackParticipant | ISharedContent) => {
    const id = pp.id
    this.connectedGroups[id].dispose()
    delete this.connectedGroups[id]

    this.manager.removeSpeaker(id)
  }
  private addPlayback = (pp: PlaybackParticipant) => {
    const id = pp.id
    const group = this.manager.addPlayback(id)
    this.connectedGroups[id] = new ConnectedGroupForPlayback(group, pp)
  }
  private addPlaybackContent = (pc: ISharedContent) => {
    //  console.log(`addPlaybackContent: ${JSON.stringify(pc)}`)
    const id = pc.id
    const group = this.manager.addPlayback(id)
    this.connectedGroups[id] = new ConnectedGroupForPlayback(group, undefined, pc.id)
  }

  private removeRemote = (rp: RemoteParticipant) => {
    const id = rp.id
    this.connectedGroups[id].dispose()
    delete this.connectedGroups[id]

    this.manager.removeSpeaker(id)
  }
  private addRemote = (remote: RemoteParticipant) => {
    const group = this.manager.addSpeaker(remote.id)
    this.connectedGroups[remote.id] = new ConnectedGroup(undefined, remote, group)
  }

  private removeContent = (content: ISharedContent) => {
    this.connectedGroups[content.id].dispose()
    delete this.connectedGroups[content.id]
    this.manager.removeSpeaker(content.id)
  }
  private addContent = (content: ISharedContent) => {
    const group = this.manager.addSpeaker(content.id)
    this.connectedGroups[content.id] = new ConnectedGroup(content, undefined, group)
  }
}
