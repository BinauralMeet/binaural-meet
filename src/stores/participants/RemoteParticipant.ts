import {RemoteParticipant as IRemoteParticipant} from '@models/Participant'
import {makeObservable, observable} from 'mobx'
import {Store} from '../utils'
import {TracksStore} from './ParticipantBase'
import {RemoteOrPlaybackParticipant} from './RemoteOrPlaybackParticipant'

export class RemoteParticipant extends RemoteOrPlaybackParticipant implements Store<IRemoteParticipant> {
  @observable.shallow tracks = new TracksStore()
  constructor(id:string) {
    super(id)
    makeObservable(this)
  }
}
