import {PlaybackParticipant as IPlaybackParticipant} from '@models/Participant'
import {makeObservable, observable} from 'mobx'
import {Store} from '../utils'
import {MediaClip} from '@stores/media/MediaClip'
import {RemoteOrPlaybackParticipant} from './RemoteOrPlaybackParticipant'

export class PlaybackParticipant extends RemoteOrPlaybackParticipant implements Store<IPlaybackParticipant> {
  @observable clip?:MediaClip
  constructor(id:string) {
    super(id)
    makeObservable(this)
  }
}
