import { makeObservable, observable} from 'mobx'

export class MediaClip{
  @observable.ref videoBlob?: Blob
  videoTime = 0
  @observable.ref audioBlob?: Blob
  audioTime = 0
  @observable audioDuration = 0
  @observable videoFrom = 0
  @observable audioFrom = 0
  @observable rate = 1
  @observable pause = false
  constructor(){
    makeObservable(this)
  }
}
