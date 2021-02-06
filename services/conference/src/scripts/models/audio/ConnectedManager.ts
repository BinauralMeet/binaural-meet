import {RemoteParticipant} from '@models/Participant'
import {diffMap} from '@models/utils'
import participants from '@stores/participants/Participants'
import contents from '@stores/sharedContents/SharedContents'
import {JitsiRemoteTrack} from 'lib-jitsi-meet'
import {autorun} from 'mobx'
import {ConnectedGroup} from './ConnectedGroup'
import {StereoManager} from './StereoManager'
export class ConnectedManager {
  private readonly manager = new StereoManager()

  private readonly connectedGroups: {
    [key: string]: ConnectedGroup,
  } = {}

  private participantsMemo = new Map<string, RemoteParticipant>()
  private contentsMemo = new Map<string, Set<JitsiRemoteTrack>>()

  public setAudioOutput(deviceId: string) {
    this.manager.setAudioOutput(deviceId)
  }
  constructor() {
    autorun(this.onPopulationChange)
    autorun(this.onScreenContentsChange)
    autorun(
      () => {
        this.manager.switchPlayMode(participants.local.useStereoAudio ? 'Context' : 'Element',
                                    participants.local.plugins.streamControl.muteSpeaker)
      },
    )
  }

  private onPopulationChange = () => {
    const newRemotes = new Map(participants.remote)
    const added = diffMap(newRemotes, this.participantsMemo)
    const removed = diffMap(this.participantsMemo, newRemotes)
    removed.forEach(this.remove)
    added.forEach(this.add)
    this.participantsMemo = newRemotes
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

  private remove = (rp: RemoteParticipant) => {
    const id = rp.id
    this.connectedGroups[id].dispose()
    delete this.connectedGroups[id]

    this.manager.removeSpeaker(id)
  }

  private add = (remote: RemoteParticipant) => {
    const group = this.manager.addSpeaker(remote.id)
    this.connectedGroups[remote.id] = new ConnectedGroup(participants.local_, remote, undefined, group)
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
        this.connectedGroups[carrierId] = new ConnectedGroup(participants.local_, undefined, audioTrack, group)
      }else {
        console.error('addContent: track does not have content id.', audioTrack)
      }
    }
  }
}
