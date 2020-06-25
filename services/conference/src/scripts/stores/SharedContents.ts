import {connection} from '@models/api'
import {assert} from '@models/utils'
import {action, computed, observable} from 'mobx'
import {connectionInfo} from '.'
import {Participant} from './Participant'
import {default as participants, Participants} from './Participants'
import {SharedContent} from './SharedContent'

export class SharedContents {
  //  All shared objects. Z order is kept
  @observable.shallow order: Map<string, SharedContent> = new Map<string, SharedContent>()
  @computed get count(): number {
    return this.order.size
  }
  @action sendOrder() {
    connection.sendSharedContentsOrder(this.order)
  }
  @action join(pid:string) {
    const map = connection.getSharedContentsOrder(pid)
    const toAdd = map.diff(this.order)
    toAdd.forEach((val, key) => this.order.set(key, val))
  }
}

export default new SharedContents()
