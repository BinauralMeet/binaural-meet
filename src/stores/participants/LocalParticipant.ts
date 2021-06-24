import {LocalInformation, LocalParticipant as ILocalParticipant, RemoteInformation} from '@models/Participant'
import {urlParameters} from '@models/url'
import {shallowObservable, Store} from '@stores/utils'
import {action, makeObservable, observable} from 'mobx'
import {ParticipantBase} from './ParticipantBase'

export class LocalParticipant extends ParticipantBase implements Store<ILocalParticipant> {
  @observable useStereoAudio = false  //  will be override by url switch

  information = this.information as LocalInformation
  informationToSend:RemoteInformation

  constructor() {
    super(true)
    const info:Partial<LocalInformation> = Object.assign({}, this.information)
    delete info.email
    this.informationToSend = shallowObservable<RemoteInformation>(info as RemoteInformation)
    makeObservable(this)
    if (urlParameters.name) { this.information.name = urlParameters.name }
    this.useStereoAudio = urlParameters.headphone !== null ? true : false
    //  console.debug('URL headphone', urlParameters.headphone)
    this.muteAudio = urlParameters.muteMic !== null ? true : false
    //  console.debug('URL muteMic', urlParameters.muteMic)
    this.muteVideo = urlParameters.muteCamera !== null ? true : false
    //  console.debug('URL muteCamera', urlParameters.muteCamera)
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
}
