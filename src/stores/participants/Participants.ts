import {JitsiRemoteTrack} from 'lib-jitsi-meet'
import {action, computed, makeObservable, observable} from 'mobx'
import {LocalParticipant} from './LocalParticipant'
import {RemoteParticipant} from './RemoteParticipant'
interface GhostsInfo{
  room:string,
  pids:[string, number][],
}


export class Participants {
  constructor() {
    makeObservable(this)
    this.loadGhostsFromStorage()
  }

  @observable.shallow readonly remote = new Map<string, RemoteParticipant>()
  local_ = observable.box(new LocalParticipant())

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

  //  local ghosts pids, or pid before reload.
  ghostCandidates:GhostsInfo = {room:'', pids:[]}
  //  save and load ghost pids
  saveGhostsToStorage() {
    sessionStorage.setItem('ghosts', JSON.stringify(this.ghostCandidates))
  }
  @action loadGhostsFromStorage() {
    const str = sessionStorage.getItem('ghosts')
    if (str) {
      const loaded = JSON.parse(str) as GhostsInfo
      const now = Date.now()
      if (loaded.pids.find(pid => pid[1] > now - 10 * 1000)) {
        this.ghostCandidates = loaded
      }
    }
  }
  @observable localGhosts: Set<string> = new Set()
  //  all ghosts include remotes
  @observable ghosts: Set<string> = new Set()
}

const participants = new Participants()
declare const d:any
d.participants = participants
export default participants
