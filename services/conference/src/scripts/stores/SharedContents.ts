import {assert} from '@models/utils'
import {action, computed, observable} from 'mobx'
import {SharedContent} from './SharedContent'
import { connection } from '@models/api'

export class SharedContents {
  //  All shared objects. Z order is kept
  @observable order: Map<string, SharedContent> = new Map<string, SharedContent>()
  @computed get count(): number {
    return this.order.size
  }
  @action sendOrder(){
    connection.sendSharedContentsOrder(this.order)
  }
}

export default new SharedContents()
