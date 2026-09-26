import {makeObservable, observable} from 'mobx'
import {loadFromStorage, saveToStorage} from '@stores/utils/PersistentStore'

export class Settings {
  @observable lpsId=''
  @observable lpsUrl=''

  //  Speech-to-text (bm workspace doc: `stt-translation`). Each participant's own view of it --
  //  but `showSubtitles` is more than a view: the room transcribes exactly while somebody has it
  //  on (`stt-translation#ui`), so it defaults to off. Defaulting to on would mean every room
  //  transcribing everybody from the moment it opens, which nobody asked for and which costs
  //  recognizer time for nobody's benefit.
  @observable showSubtitles=false //  do I want to see subtitles at all
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
