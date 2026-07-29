import {ISharedContent} from '@models/ISharedContent'
import {RemoteInformation} from '@models/Participant'
import {RemoteParticipant as IRemoteParticipant, PlaybackParticipant as IPlaybackParticipant} from '@models/Participant'
import {action, makeObservable, observable} from 'mobx'
import {Store} from '../utils'
import {MediaClip} from '@stores/media/MediaClip'
import {ParticipantBase, TrackStates, TracksStore} from './ParticipantBase'

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

export class RemoteParticipant extends RemoteOrPlaybackParticipant implements Store<IRemoteParticipant> {
  @observable.shallow tracks = new TracksStore()
  constructor(id:string) {
    super(id)
    makeObservable(this)
  }
}

export class PlaybackParticipant extends RemoteOrPlaybackParticipant implements Store<IPlaybackParticipant> {
  @observable clip?:MediaClip
  constructor(id:string) {
    super(id)
    makeObservable(this)
  }
}
