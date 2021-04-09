import {RemoteParticipant as IRemoteParticipant, TrackStates as ITrackStates} from '@models/Participant'
import {makeObservable, observable} from 'mobx'
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
  constructor(id:string) {
    super()
    makeObservable(this)
    this.id = id
  }
  @observable trackStates = new TrackStates()
}
