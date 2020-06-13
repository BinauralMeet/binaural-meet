import {assert} from '@models/utils'
import {action, computed, observable} from 'mobx'
import {SharedContent} from './SharedContent'

export class SharedContents {
  @observable.shallow readonly shared: Array<SharedContent> = new Array<SharedContent>()
  uploaded: SharedContent|null = null

  @computed get count(): number {
    return this.shared.length
  }
}

export default new SharedContents()
