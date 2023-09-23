import {makeObservable, observable} from 'mobx'
class Loads{
  @observable rtcLoad=0
  @observable dataLoad=0
  constructor(){
    makeObservable(this)
  }
}
export const messageLoads = new Loads()
