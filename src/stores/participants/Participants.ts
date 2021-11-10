import { PARTICIPANT_SIZE } from '@models/Participant'
import {JitsiRemoteTrack} from 'lib-jitsi-meet'
import {action, computed, makeObservable, observable} from 'mobx'
import {LocalParticipant} from './LocalParticipant'
import {PlaybackParticipant} from './PlaybackParticipant'
import {RemoteParticipant} from './RemoteParticipant'

export class Participants {
  constructor() {
    makeObservable(this)
  }

  @observable.shallow readonly remote = new Map<string, RemoteParticipant>()
  local_ = observable.box(new LocalParticipant())
  @observable.shallow readonly playback = new Map<string, PlaybackParticipant>()

  @observable readonly yarnPhones = new Set<string>()
  @observable yarnPhoneUpdated = false

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
    this.local.id = id
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

  @action leaveAll(){
    this.remote.clear()
    this.setLocalId('')
  }

  find(participantId: string): LocalParticipant | RemoteParticipant | undefined {
    if (participantId === this.localId) {

      return this.local
    }

    const res = this.remote.get(participantId)

    return res
  }

  getPlayback(id: string){
    let rv = this.playback.get(id)
    if (!rv){
      rv = new PlaybackParticipant(id)
      this.playback.set(id, rv)
    }

    return rv
  }
  removePlayback(id:string){
    return this.playback.delete(id)
  }

  addRemoteTrack(track: JitsiRemoteTrack):boolean {
    const remote = this.remote.get(track.getParticipantId())
    if (!remote) { return false }
    if (track.isAudioTrack()) {
      remote.tracks.audio = track
    } else {
      remote.tracks.avatar = track
      track.getTrack().addEventListener('ended', () => { remote.tracks.avatar = undefined })
      track.getTrack().addEventListener('mute', () => { remote.tracks.onMuteChanged(track, true) })
      track.getTrack().addEventListener('unmute', () => { remote.tracks.onMuteChanged(track, false) })
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

  audibleArea(){
    return [this.local.pose.position[0], this.local.pose.position[1], PARTICIPANT_SIZE * 7]
  }
}

const participants = new Participants()
declare const d:any
d.participants = participants
export default participants
