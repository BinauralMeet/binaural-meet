import {
  defaultInformation, defaultPhysics,
  defaultRemoteInformation,
  LocalInformation, Mouse, ParticipantBase as IParticipantBase, Physics, RemoteInformation, Tracks,
} from '@models/Participant'
import {findReverseColorRGB, findTextColorRGB, getRandomColorRGB, rgb2Color} from '@models/utils'
import {MapObject} from '@stores/MapObject'
import {Store} from '@stores/utils'
import {JitsiTrack} from 'lib-jitsi-meet'
import {action, computed, makeObservable, observable} from 'mobx'

export class TracksStore<T extends JitsiTrack> implements Tracks{
  constructor(){
    makeObservable(this)
  }
  @observable.ref audio:T|undefined = undefined
  @observable audioLevel = 0
  @observable.ref avatar:T|undefined = undefined
  @observable avatarOk = this.avatar ? !this.avatar.getTrack().muted : true
  @computed get audioStream() { return this.audio?.getOriginalStream() }
  @computed get avatarStream() { return this.avatarOk ? this.avatar?.getOriginalStream() : undefined }
  @action onMuteChanged(track: JitsiTrack, mute: boolean) {
    if (track === this.avatar) {
      this.avatarOk = !mute
    }
  }
  @action setAudioLevel(newLevel: number) {
    this.audioLevel = newLevel
  }
}


export class ParticipantBase extends MapObject implements Store<IParticipantBase> {
  @observable id = ''
  @observable.shallow tracks = new TracksStore<JitsiTrack>()
  @observable.shallow physics = defaultPhysics
  @observable.shallow mouse:Mouse = {position:[0, 0], show:false}
  @observable awayFromKeyboard = false
  @observable.shallow information: LocalInformation | RemoteInformation
  @observable muteAudio = false
  @observable muteSpeaker = false
  @observable muteVideo = false
  // determines whether the audio would be rendered
  @computed get showAudio () {
    return !this.muteAudio && this.perceptibility.audibility
  }
  // determines whether the video would be rendered
  @computed get showVideo () {
    return !this.muteVideo && this.perceptibility.coreContentVisibility
  }

  constructor(isLocal=false) {
    super()
    makeObservable(this)
    if (isLocal){
      this.information = defaultInformation
    }else{
      this.information = defaultRemoteInformation
    }
  }

  getColor() {
    let color = this.information.color
    if (!color.length) {
      if (this.information.name.length){
        color = getRandomColorRGB(this.information.name)
      }else{
        color = [0xD0, 0xD0, 0xE0]
      }
    }
    let textColor = this.information.textColor
    if (!textColor.length) {
      textColor = findTextColorRGB(color)
    }
    const reverseRGB = findReverseColorRGB(color)
    const colors = [rgb2Color(color), rgb2Color(textColor), rgb2Color(reverseRGB)]

    return colors
  }

  getColorRGB() {
    return this.information.color.length ? this.information.color : getRandomColorRGB(this.information.name)
  }
  getTextColorRGB() {
    let textColor = this.information.textColor
    if (!textColor.length) {
      let color = this.information.color
      if (!color.length) {
        color = getRandomColorRGB(this.information.name)
      }
      textColor = findTextColorRGB(color)
    }

    return textColor
  }

  @action.bound
  setPhysics(physics: Partial<Physics>) {
    Object.assign(this.physics, physics)
  }
}

