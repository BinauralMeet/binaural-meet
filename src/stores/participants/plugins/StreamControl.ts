import {ParticipantBase as IParticipantBase} from '@models/Participant'
import {Store} from '@stores/utils'
import {computed, makeObservable, observable} from 'mobx'
import {ParticipantStorePlugin} from './utils'

export class StreamControl extends ParticipantStorePlugin {
  constructor(parent: Store<IParticipantBase>) {
    super(parent)
    makeObservable(this)
  }

  @observable muteAudio = false
  @observable muteSpeaker = false
  @observable muteVideo = false
  // @observable attenuation = 1

  // determines whether the audio would be rendered
  @computed get showAudio () {
    return !this.muteAudio && this.parent.perceptibility.audibility
  }

  // determines whether the video would be rendered
  @computed get showVideo () {
    return !this.muteVideo && this.parent.perceptibility.coreContentVisibility
  }
}
