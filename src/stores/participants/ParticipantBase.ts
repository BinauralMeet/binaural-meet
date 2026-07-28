import {
  defaultInformation, defaultPhysics, defaultRemoteInformation,
  defaultViewpoint, LocalInformation,
  ParticipantBase as IParticipantBase, Physics, RemoteInformation, Tracks, TrackStates as ITrackStates
} from '@models/Participant'
import {findReverseColorRGB, findTextColorRGB, getRandomColorRGB, isVrmUrl, rgb2Color} from '@models/utils'
import {Mouse} from '@models/utils'
import { VrmRig } from '@models/utils/vrmIK'
import {MapObject} from '@stores/map/MapObject'
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

// Parameterized over the concrete information type so subclasses (which each only
// ever hold one member of the LocalInformation|RemoteInformation union) get a
// correctly narrowed `information` for free, instead of each redeclaring its own
// getter/setter pair just to override the type.
export class ParticipantBase<TInfo extends LocalInformation | RemoteInformation = LocalInformation | RemoteInformation>
  extends MapObject implements Store<IParticipantBase> {
  @observable id = ''
  @observable zIndex = 0
  @observable.shallow physics = defaultPhysics
  @observable.shallow viewpoint = defaultViewpoint
  @observable.shallow mouse:Mouse = {position:[0, 0], show:false}
  @observable.shallow information: TInfo
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
    // Cast is safe: callers pick isLocal to match the TInfo they instantiate with
    // (LocalParticipant passes true, Remote/PlaybackParticipant pass false/omit it).
    this.information = (isLocal ? defaultInformation : defaultRemoteInformation) as TInfo
    makeObservable(this)
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

  public hasVrm(){
    return isVrmUrl(this.information.avatarSrc)
  }
}
