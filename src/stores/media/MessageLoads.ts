import {makeObservable, observable} from 'mobx'
class Loads{
  @observable loadData=0
  @observable loadRtc=0
  @observable rttData=0
  constructor(){
    makeObservable(this)
  }
}
export const messageLoads = new Loads()
