import {assert} from '@models/utils'
import {action, computed, observable} from 'mobx'
import {SharedObject} from './SharedObject'

export class SharedObjects {
  @observable.shallow readonly shared: Array<SharedObject> = new Array<SharedObject>()
  uploaded: SharedObject|null = null

  @computed get count(): number {
    return this.shared.length
  }
}

export default new SharedObjects()
