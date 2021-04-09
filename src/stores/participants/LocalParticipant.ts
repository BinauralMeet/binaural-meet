import {Pose2DMap} from '@models/MapObject'
import {LocalParticipant as ILocalParticipant, Physics, TrackStates} from '@models/Participant'
import {urlParameters} from '@models/url'
import {action, computed, makeObservable, observable} from 'mobx'
import {Store} from '../utils'
import {DevicePreference} from './localPlugins'
import {ParticipantBase} from './ParticipantBase'
// config.js
declare const config:any                  //  from ../../config.js included from index.html

interface MediaSettings {
  stream:{
    muteVideo: boolean,
    muteAudio: boolean,
    muteSpeaker: boolean,
  },
  device:DevicePreference,
  headphone: boolean,
  soundLocalizationBase: string,
}

interface PhysicsInfo{
  pose: Pose2DMap,
  physics: Physics,
}

export class LocalParticipant extends ParticipantBase implements Store<ILocalParticipant> {
  devicePreference = new DevicePreference()
  @observable useStereoAudio = false  //  will be override by url switch
  @observable thirdPersonView = config.thirdPersonView as boolean
  @observable soundLocalizationBase = config.soundLocalizationBase ? config.soundLocalizationBase : 'user'
  @observable remoteVideoLimit = config.remoteVideoLimit || -1 as number
  @observable remoteAudioLimit = config.remoteAudioLimit || -1 as number
  @action setThirdPersonView(tpv: boolean) { this.thirdPersonView = tpv }
  @computed get trackStates():TrackStates {
    return {
      micMuted: this.plugins.streamControl.muteAudio,
      speakerMuted: this.plugins.streamControl.muteSpeaker,
      headphone: this.useStereoAudio,
    }
  }
  constructor() {
    super()
    makeObservable(this)
    this.loadInformationFromStorage()
    if (urlParameters.name) { this.information.name = urlParameters.name }
    this.useStereoAudio = urlParameters.headphone !== null ? true : false
    //  console.debug('URL headphone', urlParameters.headphone)
    this.plugins.streamControl.muteAudio = urlParameters.muteMic !== null ? true : false
    //  console.debug('URL muteMic', urlParameters.muteMic)
    this.plugins.streamControl.muteVideo = urlParameters.muteCamera !== null ? true : false
    //  console.debug('URL muteCamera', urlParameters.muteCamera)
    this.loadMediaSettingsFromStorage()
    this.loadPhysicsFromStorage()
  }

  //  save and load participant's name etc.
  saveInformationToStorage(isLocalStorage:boolean) {
    let storage = sessionStorage
    if (isLocalStorage) { storage = localStorage }
    //  console.log(storage === localStorage ? 'Save to localStorage' : 'Save to sessionStorage')
    storage.setItem('localParticipantInformation', JSON.stringify(this.information))
  }
  @action.bound
  loadInformationFromStorage() {
    let storage = localStorage
    if (sessionStorage.getItem('localParticipantInformation')) {
      storage = sessionStorage
    }
    //  console.debug(storage === localStorage ? 'Load from localStorage' : 'Load from sessionStorage')
    const infoInStr = storage.getItem('localParticipantInformation')
    if (infoInStr) {
      Object.assign(this.information, JSON.parse(infoInStr))
    }
  }

  //  Save and MediaSettings etc.
  saveMediaSettingsToStorage(isLocalStorage:boolean) {
    let storage = sessionStorage
    if (isLocalStorage) { storage = localStorage }
    const muteStatus:MediaSettings = {
      stream:{
        muteVideo: this.plugins.streamControl.muteVideo,
        muteAudio: this.plugins.streamControl.muteAudio,
        muteSpeaker: this.plugins.streamControl.muteSpeaker,
      },
      device:this.devicePreference,
      headphone: this.useStereoAudio,
      soundLocalizationBase: this.soundLocalizationBase,
    }
    //  console.log(storage === localStorage ? 'Save to localStorage' : 'Save to sessionStorage')
    storage.setItem('localParticipantStreamControl', JSON.stringify(muteStatus))
  }
  @action.bound
  loadMediaSettingsFromStorage() {
    let storage = localStorage
    if (sessionStorage.getItem('localParticipantStreamControl')) {
      storage = sessionStorage
    }
    const settingInStr = storage.getItem('localParticipantStreamControl')
    if (settingInStr) {
      const setting = JSON.parse(settingInStr) as MediaSettings
      Object.assign(this.plugins.streamControl, setting.stream)
      Object.assign(this.devicePreference, setting.device)
      this.useStereoAudio = setting.headphone
      this.soundLocalizationBase = setting.soundLocalizationBase
    }
  }

  //  Save and load physics
  savePhysicsToStorage(isLocalStorage:boolean) {
    let storage = sessionStorage
    if (isLocalStorage) { storage = localStorage }
    //  console.log(storage === localStorage ? 'Save to localStorage' : 'Save to sessionStorage')
    const physics: PhysicsInfo = {
      pose: this.pose,
      physics: this.physics,
    }
    storage.setItem('localParticipantPhysics', JSON.stringify(physics))
  }
  @action.bound
  loadPhysicsFromStorage() {
    let storage = localStorage
    if (sessionStorage.getItem('localParticipantPhysics')) {
      storage = sessionStorage
    }
    //  console.debug(storage === localStorage ? 'Load from localStorage' : 'Load from sessionStorage')
    const str = storage.getItem('localParticipantPhysics')
    if (str) {
      const physics = JSON.parse(str) as PhysicsInfo
      Object.assign(this.physics, physics.physics)
      Object.assign(this.pose, physics.pose)
    }
  }

}
