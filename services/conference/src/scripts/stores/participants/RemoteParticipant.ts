import {RemoteParticipant as IRemoteParticipant, TrackStates as ITrackStates} from '@models/Participant'
import {observable} from 'mobx'
import {Store} from '../utils'
import {ParticipantBase} from './ParticipantBase'

class TrackStates implements Store<ITrackStates>{
  @observable micMuted = false
  @observable headphone = false
}

export class RemoteParticipant extends ParticipantBase implements Store<IRemoteParticipant> {
  @observable trackStates = new TrackStates()
}
