import { ISharedContent } from '@models/ISharedContent'
import {LocalInformation, LocalParticipant as ILocalParticipant, Physics, RemoteInformation, TrackStates} from '@models/Participant'
import {urlParameters} from '@models/url'
import {checkImageUrl, mulV2, Pose2DMap, subV2} from '@models/utils'
import {MapData} from '@stores/Map'
import {Store} from '@stores/utils'
import md5 from 'md5'
import {action, computed, makeObservable, observable} from 'mobx'
import {autorun} from 'mobx'
import {DevicePreference} from './localPlugins'
import {ParticipantBase, TracksStore} from './ParticipantBase'
// config.js
declare const config:any                  //  from ../../config.js included from index.html

export interface MediaSettings{
  stream:{
    muteVideo: boolean,
    muteAudio: boolean,
    muteSpeaker: boolean,
  },
  device:DevicePreference,
  headphone: boolean,
  soundLocalizationBase: string,
  uploadPreference: string
}

interface PhysicsInfo{
  pose: Pose2DMap,
  physics: Physics,
}

type UploaderPreference = 'gyazo' | 'gdrive'

export class LocalParticipant extends ParticipantBase implements Store<ILocalParticipant> {
  devicePreference = new DevicePreference()
  @observable.shallow tracks = new TracksStore()
  @observable useStereoAudio = false  //  will be override by url switch
  @observable thirdPersonView = config.thirdPersonView as boolean
  @observable soundLocalizationBase = config.soundLocalizationBase ? config.soundLocalizationBase : 'user'
  @observable uploaderPreference:UploaderPreference = config.uploaderPreference ? config.uploaderPreference : 'gyazo'
  @observable.ref zone:ISharedContent|undefined = undefined    //  The zone on which the local participant located.
  @observable remoteVideoLimit = config.remoteVideoLimit as number || -1
  @observable remoteAudioLimit = config.remoteAudioLimit as number || -1
  @observable audioInputDevice:string|undefined = undefined
  @observable videoInputDevice:string|undefined = undefined
  @observable audioOutputDevice:string|undefined = undefined


  information = this.information as LocalInformation
  @observable.ref informationToSend:RemoteInformation|undefined
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
    this.informationToSend = undefined
    makeObservable(this)
    this.loadInformationFromStorage()
    if (urlParameters.name) { this.information.name = urlParameters.name }
    this.useStereoAudio = urlParameters.headphone !== null ? true : false
    //  console.debug('URL headphone', urlParameters.headphone)
    this.muteAudio = urlParameters.muteMic !== null ? true : false
    //  console.debug('URL muteMic', urlParameters.muteMic)
    this.muteVideo = urlParameters.cameraOn !== null ? false : true
    //  console.debug('URL cameraOn', urlParameters.cameraOn)
    this.loadMediaSettingsFromStorage()
    this.loadPhysicsFromStorage()
    autorun(() => { //  image avatar
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
    const {email, ...info} = this.information
    this.informationToSend = info
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

  @action updateViewpointCenter(map: MapData){
    const pos = map.toWindow(this.pose.position)
    this.viewpoint.center = subV2(mulV2(0.5, map.screenSize), pos)
  }

  //  Save and MediaSettings etc.
  saveMediaSettingsToStorage() {
    const muteStatus:MediaSettings = {
      stream:{
        muteVideo: this.muteVideo,
        muteAudio: this.muteAudio,
        muteSpeaker: this.muteSpeaker,
      },
      device:this.devicePreference,
      headphone: this.useStereoAudio,
      soundLocalizationBase: this.soundLocalizationBase,
      uploadPreference: this.uploaderPreference,
    }
    //  console.log(storage === localStorage ? 'Save to localStorage' : 'Save to sessionStorage')
    localStorage.setItem('localParticipantStreamControl', JSON.stringify(muteStatus))
    sessionStorage.setItem('localParticipantStreamControl', JSON.stringify(muteStatus))
  }
  @action.bound
  loadMediaSettingsFromStorage(rv?: MediaSettings) {
    const settingStrInLocal = localStorage.getItem('localParticipantStreamControl')
    const settingStrInSession = sessionStorage.getItem('localParticipantStreamControl')
    let settingLocal: MediaSettings|undefined = undefined
    let settingSession: MediaSettings|undefined = undefined
    if (settingStrInLocal) { settingLocal = JSON.parse(settingStrInLocal) as MediaSettings }
    if (settingStrInSession) { settingSession = JSON.parse(settingStrInSession) as MediaSettings }
    const setting = settingLocal
    if (setting){
      setting.stream.muteVideo = true
      if (settingSession){ setting.stream.muteVideo = settingSession.stream.muteVideo }
      if (rv){
        Object.assign(rv, setting)
      }else{
        Object.assign(this, setting.stream)
        Object.assign(this.devicePreference, setting.device)
        this.useStereoAudio = setting.headphone
        this.soundLocalizationBase = setting.soundLocalizationBase
      }
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
