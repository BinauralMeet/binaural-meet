import {Pose2DMap} from '@models/MapObject'
import {LocalInformation, LocalParticipant as ILocalParticipant, Physics, RemoteInformation, TrackStates} from '@models/Participant'
import {urlParameters} from '@models/url'
import {checkImageUrl} from '@models/utils'
import {shallowObservable, Store} from '@stores/utils'
import md5 from 'md5'
import {action, computed, makeObservable, observable} from 'mobx'
import {autorun} from 'mobx'
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
  @observable audioInputDevice:string|undefined = undefined
  @observable videoInputDevice:string|undefined = undefined
  @observable audioOutputDevice:string|undefined = undefined

  information = this.information as LocalInformation
  informationToSend:RemoteInformation
  @action setThirdPersonView(tpv: boolean) { this.thirdPersonView = tpv }
  @computed get trackStates():TrackStates {
    return {
      micMuted: this.muteAudio,
      speakerMuted: this.muteSpeaker,
      headphone: this.useStereoAudio,
    }
  }
  get info():LocalInformation { return this.information as LocalInformation}

  constructor() {
    super(true)
    const info:Partial<LocalInformation> = Object.assign({}, this.information)
    delete info.email
    this.informationToSend = shallowObservable<RemoteInformation>(info as RemoteInformation)
    makeObservable(this)
    this.loadInformationFromStorage()
    if (urlParameters.name) { this.information.name = urlParameters.name }
    this.useStereoAudio = urlParameters.headphone !== null ? true : false
    //  console.debug('URL headphone', urlParameters.headphone)
    this.muteAudio = urlParameters.muteMic !== null ? true : false
    //  console.debug('URL muteMic', urlParameters.muteMic)
    this.muteVideo = urlParameters.muteCamera !== null ? true : false
    //  console.debug('URL muteCamera', urlParameters.muteCamera)
    this.loadMediaSettingsFromStorage()
    this.loadPhysicsFromStorage()
    autorun(() => {
      const gravatar = 'https://www.gravatar.com/avatar/'
      let src = this.information.avatarSrc
      if ((!src || src.includes(gravatar, 0)) && this.information.email){
        const hash = md5(this.information.email.trim().toLowerCase())
        src = `${gravatar}${hash}?d=404`
      }
      if (src){
        checkImageUrl(src).then((src)=>{
          this.information.avatarSrc = src
        }).catch(()=>{
          this.information.avatarSrc = ''
        })
      }
    })
  }

  //  send infomration to other participants
  @action sendInformation(){
    const info = Object.assign({}, this.information) as Partial<LocalInformation>
    delete info.email
    Object.assign(this.informationToSend, info)
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
        muteVideo: this.muteVideo,
        muteAudio: this.muteAudio,
        muteSpeaker: this.muteSpeaker,
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
      Object.assign(this, setting.stream)
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
