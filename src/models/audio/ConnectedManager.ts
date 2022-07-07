import { IPlaybackContent, ISharedContent } from '@models/ISharedContent'
import {PlaybackContent, PlaybackParticipant, RemoteParticipant} from '@models/Participant'
import {urlParameters} from '@models/url'
import {diffMap} from '@models/utils'
import participants from '@stores/participants/Participants'
import contents from '@stores/sharedContents/SharedContents'
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
  private contentsMemo = new Map<string, ISharedContent>()
  private playbackContentsMemo = new Map<string, PlaybackContent>()

  public setAudioOutput(deviceId: string) {
    this.manager.setAudioOutput(deviceId)
  }
  constructor() {
    if (urlParameters.testBot !== null) { return }

    autorun(this.onRemotesChange)
    autorun(this.onPlaybacksChange)
    autorun(this.onPlaybackContentsChange)
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
  private onPlaybackContentsChange = () => {
    const newPlaybackContents = new Map(contents.playbackContents)
    const added = diffMap(newPlaybackContents, this.playbackContentsMemo)
    const removed = diffMap(this.playbackContentsMemo, newPlaybackContents)
    removed.forEach(this.removePlayback)
    added.forEach(this.addPlaybackContent)
    this.playbackContentsMemo = newPlaybackContents
    //  console.log('Update connectedGroups:', this.connectedGroups)
  }

  private onScreenContentsChange = () => {
    const audioRemoteContents = contents.getRemoteRtcContentIds().filter(cid => contents.getContentTrack(cid, 'audio'))
    const newRemotes = new Map(audioRemoteContents.map(cid => [cid, contents.find(cid)!]))
    const added = diffMap(newRemotes, this.contentsMemo)
    const removed = diffMap(this.contentsMemo, newRemotes)
    removed.forEach(this.removeContent)
    added.forEach(this.addContent)
    this.contentsMemo = newRemotes
  }

  private removePlayback = (pp: PlaybackParticipant | IPlaybackContent) => {
    const id = pp.id
    this.connectedGroups[id].dispose()
    delete this.connectedGroups[id]

    this.manager.removeSpeaker(id)
  }
  private addPlayback = (pp: PlaybackParticipant) => {
    const id = pp.id
    const group = this.manager.addPlayback(id)
    this.connectedGroups[id] = new ConnectedGroupForPlayback(participants.local_, group, pp)
  }
  private addPlaybackContent = (pc: IPlaybackContent) => {
    //  console.log(`addPlaybackContent: ${JSON.stringify(pc)}`)
    const id = pc.id
    const group = this.manager.addPlayback(id)
    this.connectedGroups[id] = new ConnectedGroupForPlayback(participants.local_, group, undefined, pc.id)
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

  private removeContent = (content: ISharedContent) => {
    this.connectedGroups[content.id].dispose()
    delete this.connectedGroups[content.id]
    this.manager.removeSpeaker(content.id)
  }
  private addContent = (content: ISharedContent) => {
    const group = this.manager.addSpeaker(content.id)
    this.connectedGroups[content.id] = new ConnectedGroup(participants.local_, content, undefined, group)
  }
}
