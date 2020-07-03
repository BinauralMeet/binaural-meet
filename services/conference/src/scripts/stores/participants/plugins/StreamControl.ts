import {computed, observable} from 'mobx'
import {ParticipantStorePlugin} from './utils'

export class StreamControl extends ParticipantStorePlugin {
  @observable muteAudio = false
  @observable muteVideo = false
  @observable attenuation = 1
  @observable audioInputDevice = ''
  @observable videoInputDevice = ''
  @observable audioOutputDevice = ''

  // determines whether the audio would be rendered
  @computed get showAudio () {
    return !this.muteAudio && this.parent.perceptibility.audibility
  }

  // determines whether the video would be rendered
  @computed get showVideo () {
    return !this.muteVideo && this.parent.perceptibility.coreContentVisibility
  }
}
