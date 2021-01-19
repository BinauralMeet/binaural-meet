import {JitsiRemoteTrack} from 'lib-jitsi-meet'
import {action, computed, observable} from 'mobx'
import {LocalParticipant} from './LocalParticipant'
import {RemoteParticipant} from './RemoteParticipant'

export class Participants {
  @observable.shallow readonly remote = new Map<string, RemoteParticipant>()
  local_ = observable.box(new LocalParticipant(''))

  @observable.shallow readonly directRemotes = new Set<string>()

  @computed get count(): number {
    return this.remote.size
  }

  @computed get local(): LocalParticipant {
    return this.local_.get()
  }

  @computed get localId(): string {
    return this.local.id
  }

  @action
  setLocalId(id: string) {
    const newLocal = new LocalParticipant(id)
    const oldLocal = this.local
    if (oldLocal) {
      //  copy parameters which should NOT send to remote.
      newLocal.remoteAudioLimit = oldLocal.remoteAudioLimit
      newLocal.remoteVideoLimit = oldLocal.remoteVideoLimit
    }
    this.local_.set(newLocal)
    if (oldLocal) {
      //  copy parameters which should send to remote.
      Object.assign(oldLocal, {id:newLocal.id})
      Object.assign(newLocal, oldLocal)
    }
  }

  @action
  join(participantId: string) {
    //  console.debug(`${participantId} join`)
    const newParticipant = new RemoteParticipant(participantId)
    newParticipant.physics.located = false
    this.remote.set(participantId, newParticipant)
  }

  @action
  leave(participantId: string) {
    this.remote.delete(participantId)
  }

  find(participantId: string): LocalParticipant | RemoteParticipant | undefined {
    if (participantId === this.localId) {

      return this.local
    }

    const res = this.remote.get(participantId)

    return res
  }

  addRemoteTrack(track: JitsiRemoteTrack):boolean {
    const remote = this.remote.get(track.getParticipantId())
    if (!remote) { return false }
    if (track.isAudioTrack()) {
      remote.tracks.audio = track
    } else {
      remote.tracks.avatar = track
      track.getTrack().onended = () => { remote.tracks.avatar = undefined }
      track.getTrack().onmute = () => { remote.tracks.onMuteChanged(track, true) }
      track.getTrack().onunmute = () => { remote.tracks.onMuteChanged(track, false) }
    }

    return true
  }
  removeRemoteTrack(track: JitsiRemoteTrack):boolean {
    const remote = this.remote.get(track.getParticipantId())
    if (!remote) { return false }
    if (track.isAudioTrack()) {
      remote.tracks.audio = undefined
    } else {
      remote.tracks.avatar = undefined
    }

    return true
  }

  isLocal(participantId: string) {
    return participantId === this.localId
  }
}

const participants = new Participants()
declare const d:any
d.participants = participants
export default participants
