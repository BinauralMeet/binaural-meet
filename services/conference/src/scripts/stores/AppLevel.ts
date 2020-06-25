import {AppLevel as IAppLevel} from '@models/AppLevel'
import {observable} from 'mobx'
import {Store} from './utils'

export class AppLevel implements Store<IAppLevel>{
  @observable micOn = true
  @observable cameraOn = true
  @observable screenShareOn = false
}

export default new AppLevel()
