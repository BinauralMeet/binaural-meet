import {PARTICIPANT_SIZE} from '@models/Participant'
import {TrackKind} from '@models/conference/RtcConnection'
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
    return newParticipant
  }

  @action
  getOrCreateRemote(participantId: string){
    let r = this.remote.get(participantId)
    if (!r){
      r = this.join(participantId)
    }
    return r
  }
  getRemote(participantId: string){
    return this.remote.get(participantId)
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

  getOrCreatePlayback(id: string){
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

  addRemoteTrack(peer: string, track: MediaStreamTrack){
    const participant = participants.getOrCreateRemote(peer)
    if (track.kind === 'audio'){
      participant.tracks.audio = track
    }else{
      participant.tracks.avatar = track
    }
  }
  removeRemoteTrack(peer: string, kind: TrackKind){
    const remote = this.remote.get(peer)
    if (!remote) { return false }
    if (kind === 'audio') {
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
