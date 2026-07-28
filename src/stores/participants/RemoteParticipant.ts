import { ISharedContent } from '@models/ISharedContent'
import {RemoteInformation, RemoteParticipant as IRemoteParticipant} from '@models/Participant'
import {action, makeObservable, observable} from 'mobx'
import {Store} from '../utils'
import {ParticipantBase, TracksStore, TrackStates} from './ParticipantBase'


export class RemoteParticipant extends ParticipantBase<RemoteInformation> implements Store<IRemoteParticipant> {
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
