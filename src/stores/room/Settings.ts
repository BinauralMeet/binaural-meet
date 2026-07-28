import {makeObservable, observable} from 'mobx'
import {loadFromStorage, saveToStorage} from '@stores/utils/PersistentStore'

export class Settings {
  @observable lpsId=''
  @observable lpsUrl=''

  constructor(){
    makeObservable(this)
    this.load()
  }
  save(){
    saveToStorage(this, 'settings')
  }
  load(){
    loadFromStorage(this, 'settings')
  }
}
export const settings = new Settings()

declare const d:any
d.settings = settings
export default settings
