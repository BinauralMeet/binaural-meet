import {makeObservable, observable} from 'mobx'
import {loadFromStorage, saveToStorage} from '@stores/utils/PersistentStore'

export class Settings {
  @observable lpsId=''
  @observable lpsUrl=''

  //  Speech-to-text (bm workspace doc: `stt-translation`). Whether the room transcribes at all
  //  is the room's own property (roomInfo.stt); these are each participant's own view of it.
  @observable showSubtitles=true  //  do I want to see subtitles at all
  @observable sttSpeak='auto'     //  language you speak, or 'auto' to let the recognizer decide
  @observable sttShow=''          //  language you want subtitles in ('' = whatever was spoken)

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
