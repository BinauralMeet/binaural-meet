import {
  defaultInformation, defaultPhysics,
  defaultRemoteInformation,
  LocalInformation, Mouse, ParticipantBase as IParticipantBase, Physics, RemoteInformation, Tracks,
} from '@models/Participant'
import {findReverseColorRGB, findTextColorRGB, getRandomColorRGB, rgb2Color} from '@models/utils'
import {MapObject} from '@stores/MapObject'
import {shallowObservable, Store} from '@stores/utils'
import {JitsiTrack} from 'lib-jitsi-meet'
import {action, computed, makeObservable, observable} from 'mobx'
import {Plugins} from './plugins'

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
  plugins: Plugins
  tracks = shallowObservable<TracksStore<JitsiTrack>>(new TracksStore<JitsiTrack>())
  physics = shallowObservable<Physics>(defaultPhysics)
  mouse = shallowObservable<Mouse>({position:[0, 0], show:false})
  information: LocalInformation | RemoteInformation

  constructor(isLocal=false) {
    super()
    this.plugins = new Plugins(this)
    if (isLocal){
      this.information = shallowObservable<LocalInformation>(defaultInformation)
    }else{
      this.information = shallowObservable<RemoteInformation>(defaultRemoteInformation)
    }
    makeObservable(this)
  }

  getColor() {
    let color = this.information.color
    if (!color.length) {
      color = getRandomColorRGB(this.information.name)
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

