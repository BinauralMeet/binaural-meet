import {Pose2DMap} from '@models/MapObject'
import {LocalParticipant as ILocalParticipant, Physics, SoundLocalizationBase, TrackStates} from '@models/Participant'
import mapData from '@stores/Map'
import {action, autorun, computed, observable} from 'mobx'
import {Store} from '../utils'
import {DevicePreference} from './localPlugins'
import {ParticipantBase} from './ParticipantBase'
// config.js
declare const config:any                  //  from ../../config.js included from index.html

interface MuteStatus {
  stream:{
    muteVideo: boolean,
    muteAudio: boolean,
    muteSpeaker: boolean,
  },
  headphone: boolean,
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
  constructor(id: string) {
    super(id)
  }

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
    console.debug(storage === localStorage ? 'Load from localStorage' : 'Load from sessionStorage')
    const infoInStr = storage.getItem('localParticipantInformation')
    if (infoInStr) {
      Object.assign(this.information, JSON.parse(infoInStr))
    }
  }
  saveMuteStatusToStorage(isLocalStorage:boolean) {
    let storage = sessionStorage
    if (isLocalStorage) { storage = localStorage }
    const muteStatus:MuteStatus = {
      stream:{
        muteVideo: this.plugins.streamControl.muteVideo,
        muteAudio: this.plugins.streamControl.muteAudio,
        muteSpeaker: this.plugins.streamControl.muteSpeaker,
      },
      headphone: this.useStereoAudio,
    }
    //  console.log(storage === localStorage ? 'Save to localStorage' : 'Save to sessionStorage')
    storage.setItem('localParticipantStreamControl', JSON.stringify(muteStatus))
  }
  @action.bound
  loadMuteStatusFromStorage() {
    let storage = localStorage
    if (sessionStorage.getItem('localParticipantStreamControl')) {
      storage = sessionStorage
    }
    console.debug(storage === localStorage ? 'Load from localStorage' : 'Load from sessionStorage')
    const muteStatusInStr = storage.getItem('localParticipantStreamControl')
    if (muteStatusInStr) {
      const muteStateus = JSON.parse(muteStatusInStr) as MuteStatus
      Object.assign(this.plugins.streamControl, muteStateus.stream)
      this.useStereoAudio = muteStateus.headphone
    }
  }
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
    console.debug(storage === localStorage ? 'Load from localStorage' : 'Load from sessionStorage')
    const str = storage.getItem('localParticipantPhysics')
    if (str) {
      const physics = JSON.parse(str) as PhysicsInfo
      Object.assign(this.physics, physics.physics)
      Object.assign(this.pose, physics.pose)
      mapData.focusOn(this)
    }
  }
}
