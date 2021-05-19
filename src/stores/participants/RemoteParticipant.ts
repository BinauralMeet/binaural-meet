import {RemoteInformation, RemoteParticipant as IRemoteParticipant, TrackStates as ITrackStates} from '@models/Participant'
import {action, makeObservable, observable} from 'mobx'
import {Store} from '../utils'
import {ParticipantBase} from './ParticipantBase'

class TrackStates implements Store<ITrackStates>{
  @observable micMuted = false
  @observable speakerMuted = false
  @observable headphone = false
  constructor(){
    makeObservable(this)
  }
}

export class RemoteParticipant extends ParticipantBase implements Store<IRemoteParticipant> {
  information:RemoteInformation = this.information as RemoteInformation
  @observable trackStates = new TrackStates()
  @observable called = false
  lastDistance = 0
  updateTime = Date.now()
  constructor(id:string) {
    super()
    makeObservable(this)
    this.id = id
  }
  @action call(){
    this.called = true
  }
}
