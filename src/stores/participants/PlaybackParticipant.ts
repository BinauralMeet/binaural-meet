import {ISharedContent} from '@models/ISharedContent'
import {PlaybackParticipant as IPlaybackParticipant, RemoteInformation} from '@models/Participant'
import {action, makeObservable, observable} from 'mobx'
import {Store} from '../utils'
import {ParticipantBase, TrackStates} from './ParticipantBase'
import {MediaClip} from '@stores/media/MediaClip'

export class PlaybackParticipant extends ParticipantBase<RemoteInformation> implements Store<IPlaybackParticipant> {
  @observable trackStates = new TrackStates()
  @observable called = false
  @observable inLocalsZone = false
  @observable.ref closedZone: ISharedContent | undefined = undefined
  @observable clip?:MediaClip
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
