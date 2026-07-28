import { ISharedContent } from '@models/ISharedContent'
import {LocalInformation, LocalParticipant as ILocalParticipant, Physics, RemoteInformation, TrackStates, AvatarType} from '@models/Participant'
import {mulV2, Pose2DMap, subV2} from '@models/utils'
import {MapData} from '@stores/map/Map'
import {Store} from '@stores/utils'
import {loadFromStorage, readFromStorage, saveToStorage} from '@stores/utils/PersistentStore'
import {action, computed, makeObservable, observable} from 'mobx'
import {DevicePreference} from './localPlugins'
import {ParticipantBase, TracksStore} from './ParticipantBase'
import { AllLandmarks } from '@models/utils/vrmIK'
import {applyUrlOverrides} from './localParticipantUrlOverrides'
import {setupAvatarSrcAutorun} from './localParticipantAvatarAutorun'
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
  avatarDisplay2_5D: boolean,
  avatarDisplay3D: boolean,
  viewRotateByFace: boolean,
  uploadPreference: string
}

interface PhysicsInfo{
  pose: Pose2DMap,
  physics: Physics,
}

type UploaderPreference = 'gyazo' | 'gdrive'

export class LocalParticipant extends ParticipantBase<LocalInformation> implements Store<ILocalParticipant> {
  devicePreference = new DevicePreference()
  @observable.shallow tracks = new TracksStore()
  @observable useStereoAudio = false  //  will be override by url switch
  @observable thirdPersonView = config.thirdPersonView as boolean
  @observable soundLocalizationBase = config.soundLocalizationBase ? config.soundLocalizationBase : 'avatar'
  @observable avatarDisplay2_5D:boolean = config.avatarDisplay2_5D!==undefined ? config.avatarDisplay2_5D : false
  @observable avatarDisplay3D:boolean = config.avatarDisplay3D!==undefined ? config.avatarDisplay3D : true
  @observable viewRotateByFace:boolean = config.viewRotateByFace!==undefined ? config.viewRotateByFace : false
  @observable uploaderPreference:UploaderPreference = config.uploaderPreference ? config.uploaderPreference : 'gyazo'
  @observable.ref zone:ISharedContent|undefined = undefined    //  The zone on which the local participant located.
  @observable remoteVideoLimit = config.remoteVideoLimit as number || -1
  @observable remoteAudioLimit = config.remoteAudioLimit as number || -1
  @observable faceDir = 0
  @observable.ref landmarks:AllLandmarks = {}
  @observable.ref informationToSend:RemoteInformation|undefined
  @action setThirdPersonView(tpv: boolean) { this.thirdPersonView = tpv }
  @computed get trackStates():TrackStates {
    return {
      micMuted: this.muteAudio,
      speakerMuted: this.muteSpeaker,
      headphone: this.useStereoAudio,
    }
  }
  @computed get rotateAvatarByFace(){
    return !this.avatarDisplay3D && !this.avatarDisplay2_5D
  }
  @computed get headOrientation(){
    if (this.rotateAvatarByFace){
      return this.pose.orientation
    }
    return this.pose.orientation + this.faceDir
  }
//  get info():LocalInformation { return this.information as LocalInformation}

  constructor() {
    super(true)
    this.informationToSend = undefined
    makeObservable(this)
    this.loadInformationFromStorage()
    applyUrlOverrides(this)
    this.loadMediaSettingsFromStorage()
    this.loadPhysicsFromStorage()
    setupAvatarSrcAutorun(this)
  }

  public showVrm(){
    return this.avatarDisplay2_5D || this.avatarDisplay3D
  }
  public isVrm(){
    return this.hasVrm() && this.showVrm()
  }

  //  send infomration to other participants
  @action sendInformation(){
    const {email, ...info} = this.information
    this.informationToSend = info
  }
  //  save and load participant's name etc.
  saveInformationToStorage(isLocalStorage:boolean) {
    saveToStorage(this.information, 'localParticipantInformation', isLocalStorage ? localStorage : sessionStorage)
  }
  @action.bound
  loadInformationFromStorage() {
    const storage = sessionStorage.getItem('localParticipantInformation') ? sessionStorage : localStorage
    loadFromStorage(this.information, 'localParticipantInformation', storage)
    if (this.information.avatar === 'circle'){
      this.information.avatar = config.avatar as AvatarType
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
      avatarDisplay2_5D: this.avatarDisplay2_5D,
      avatarDisplay3D: this.avatarDisplay3D,
      viewRotateByFace: this.viewRotateByFace,
      uploadPreference: this.uploaderPreference,
    }
    saveToStorage(muteStatus, 'localParticipantStreamControl', localStorage)
    saveToStorage(muteStatus, 'localParticipantStreamControl', sessionStorage)
  }
  @action.bound
  loadMediaSettingsFromStorage(rv?: MediaSettings) {
    const settingLocal = readFromStorage<MediaSettings>('localParticipantStreamControl', localStorage)
    const settingSession = readFromStorage<MediaSettings>('localParticipantStreamControl', sessionStorage)
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
        this.avatarDisplay2_5D = setting.avatarDisplay2_5D!==undefined ? setting.avatarDisplay2_5D :
          (config.avatarDisplay2_5D !== undefined ? config.avatarDisplay2_5D : false)
        this.avatarDisplay3D = setting.avatarDisplay3D!==undefined ? setting.avatarDisplay3D :
          (config.avatarDisplay3D !== undefined ? config.avatarDisplay3D : true)
//        this.viewRotateByFace = setting.viewRotateByFace!==undefined ? setting.viewRotateByFace :
//          (config.viewRotateByFace !== undefined ? config.viewRotateByFace : false)
          this.viewRotateByFace = false
      }
    }
  }

  //  Save and load physics
  savePhysicsToStorage(isLocalStorage:boolean) {
    const physics: PhysicsInfo = {
      pose: this.pose,
      physics: this.physics,
    }
    saveToStorage(physics, 'localParticipantPhysics', isLocalStorage ? localStorage : sessionStorage)
  }
  @action.bound
  loadPhysicsFromStorage() {
    const storage = sessionStorage.getItem('localParticipantPhysics') ? sessionStorage : localStorage
    const physics = readFromStorage<PhysicsInfo>('localParticipantPhysics', storage)
    if (physics) {
      Object.assign(this.physics, physics.physics)
      Object.assign(this.pose, physics.pose)
    }
  }

}
