import {
  defaultInformation, defaultPhysics, defaultRemoteInformation,
  defaultViewpoint, LocalInformation,
  ParticipantBase as IParticipantBase, Physics, RemoteInformation, Tracks, TrackStates as ITrackStates
} from '@models/Participant'
import {findReverseColorRGB, findTextColorRGB, getRandomColorRGB, isVrmUrl, rgb2Color} from '@models/utils'
import {Mouse} from '@models/utils'
import { VrmRig } from '@models/utils/vrmIK'
import {MapObject} from '@stores/MapObject'
import {Store} from '@stores/utils'
import {action, computed, makeObservable, observable} from 'mobx'

export class TracksStore implements Tracks{
  constructor(){
    makeObservable(this)
  }
  @observable.ref audio:MediaStreamTrack|undefined = undefined
  @observable.ref avatar:MediaStreamTrack|undefined = undefined
  @observable avatarOk = this.avatar ? !this.avatar.muted : true
  @computed get audioStream() {
    if (this.audio){
      const ms = new MediaStream()
      if (this.audio) ms.addTrack(this.audio)
      return ms
    }
    return undefined
  }
  @computed get avatarStream() {
    if (this.avatar){
      const ms = new MediaStream()
      if (this.avatar) ms.addTrack(this.avatar)
      return ms
    }
    return undefined
  }
  @action onMuteChanged(track: MediaStreamTrack, mute: boolean) {
    if (track === this.avatar) {
      this.avatarOk = !mute
    }
  }
}

export class TrackStates implements Store<ITrackStates>{
  @observable micMuted = false
  @observable speakerMuted = false
  @observable headphone = false
  constructor(){
    makeObservable(this)
  }
}

export class ParticipantBase extends MapObject implements Store<IParticipantBase> {
  @observable id = ''
  @observable zIndex = 0
  @observable.shallow physics = defaultPhysics
  @observable.shallow viewpoint = defaultViewpoint
  @observable.shallow mouse:Mouse = {position:[0, 0], show:false}
  @observable.shallow information_: LocalInformation | RemoteInformation
  // Add getter and setter to avoid information redifined in LocalParticipant and RemoteParticipant
  get information(): LocalInformation | RemoteInformation {
      return this.information_;
  }
  set information(value: LocalInformation | RemoteInformation) {
      this.information_ = value;
  }
  @observable muteAudio = false
  @observable muteSpeaker = false
  @observable muteVideo = false
  @observable audioLevel = 0
  @action setAudioLevel(a:number) { this.audioLevel = a }
  @observable recording = false
  // determines whether the audio would be rendered
  @computed get showAudio () {
    return !this.muteAudio
  }
  // determines whether the video would be rendered
  @computed get showVideo () {
    return !this.muteVideo
  }
  @observable quality:number|undefined = undefined
  @observable.ref vrmRig:VrmRig|undefined = undefined

  constructor(isLocal=false) {
    super()
    if (isLocal){
      this.information_ = defaultInformation
    }else{
      this.information_ = defaultRemoteInformation
    }
    makeObservable(this)
  }

  getColor() {
    let color = this.information_.color
    if (!color.length) {
      if (this.information_.name.length){
        color = getRandomColorRGB(this.information_.name)
      }else{
        color = [0xD0, 0xD0, 0xE0]
      }
    }
    let textColor = this.information_.textColor
    if (!textColor.length) {
      textColor = findTextColorRGB(color)
    }
    const reverseRGB = findReverseColorRGB(color)
    const colors = [rgb2Color(color), rgb2Color(textColor), rgb2Color(reverseRGB)]

    return colors
  }

  getColorRGB() {
    return this.information_.color.length ? this.information_.color : getRandomColorRGB(this.information_.name)
  }
  getTextColorRGB() {
    let textColor = this.information_.textColor
    if (!textColor.length) {
      let color = this.information_.color
      if (!color.length) {
        color = getRandomColorRGB(this.information_.name)
      }
      textColor = findTextColorRGB(color)
    }

    return textColor
  }

  @action.bound
  setPhysics(physics: Partial<Physics>) {
    Object.assign(this.physics, physics)
  }

  public hasVrm(){
    return isVrmUrl(this.information.avatarSrc)
  }
}
