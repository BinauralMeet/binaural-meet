import {makeObservable, observable} from 'mobx'

const storage = localStorage
export class Settings {
  @observable lpsId=''
  @observable lpsUrl=''

  constructor(){
    makeObservable(this)
    this.load()
  }
  save(){
    storage.setItem('settings', JSON.stringify(this))
  }
  load(){
    const str = storage.getItem('settings')
    if (str){
      const obj = JSON.parse(str)
      Object.assign(this, obj)
    }
  }
}
export const settings = new Settings()

declare const d:any
d.settings = settings
export default settings
