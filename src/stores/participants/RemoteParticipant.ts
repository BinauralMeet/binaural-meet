import { ISharedContent } from '@models/ISharedContent'
import {RemoteInformation, RemoteParticipant as IRemoteParticipant, TrackStates as ITrackStates} from '@models/Participant'
import {action, makeObservable, observable} from 'mobx'
import {Store} from '../utils'
import {ParticipantBase, TracksStore} from './ParticipantBase'

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
  informationReceived = false
  @observable.shallow tracks = new TracksStore()
  @observable trackStates = new TrackStates()
  @observable called = false
  @observable inLocalsZone = false
  @observable.ref closedZone: ISharedContent | undefined = undefined
  lastDistance = 0
  constructor(id:string) {
    super()
    makeObservable(this)
    this.id = id
  }
  @action call(){
    this.called = true
  }
}
