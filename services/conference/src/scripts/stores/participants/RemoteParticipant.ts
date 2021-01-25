import {RemoteParticipant as IRemoteParticipant, TrackStates as ITrackStates} from '@models/Participant'
import {observable} from 'mobx'
import {Store} from '../utils'
import {ParticipantBase} from './ParticipantBase'

class TrackStates implements Store<ITrackStates>{
  @observable micMuted = false
  @observable speakerMuted = false
  @observable headphone = false
}
export class UpdateTime{
  info = 0
  mouse = 0
  pose = 0
  physhics = 0
  trackStates = 0
  contents = 0
  mainScreenCarrier = 0
  hasNoResponse() {
    return !this.info || !this.mouse || !this.pose || !this.physhics || !this.trackStates
      || !this.contents || !this.mainScreenCarrier
  }
  hasOlderThan(time: number) {
    return (this.info && this.info < time) ||
    (this.mouse && this.mouse < time) ||
    (this.pose && this.pose < time) ||
    (this.physhics && this.physhics < time) ||
    (this.trackStates && this.trackStates < time) ||
    (this.contents && this.contents < time) ||
    (this.mainScreenCarrier && this.mainScreenCarrier < time)
  }
}

export class RemoteParticipant extends ParticipantBase implements Store<IRemoteParticipant> {
  readonly id:string
  constructor(id:string) {
    super()
    this.id = id
  }
  @observable trackStates = new TrackStates()
  updateTime = new UpdateTime()
}
