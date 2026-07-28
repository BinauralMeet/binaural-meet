import {ISharedContent} from '@models/ISharedContent'
import {RemoteInformation} from '@models/Participant'
import {action, makeObservable, observable} from 'mobx'
import {ParticipantBase, TrackStates} from './ParticipantBase'

// Common to RemoteParticipant and PlaybackParticipant: both represent a
// non-local participant driven by RemoteInformation, differing only in
// where their media comes from (a live RTC track vs. a recorded clip).
export class RemoteOrPlaybackParticipant extends ParticipantBase<RemoteInformation> {
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
