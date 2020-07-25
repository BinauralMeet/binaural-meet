import client from '@models/automerge/clients/client'
import {RawDocumentsType} from '@models/automerge/clients/RawDocumentsType'
import {AutomergedStore} from '@models/automerge/utils/AutomergedStore'
import {SharedContent} from '@models/SharedContent'
import * as AutoMerge from 'automerge'
import {action} from 'mobx'

const DOC_KEY = 'sharedContents'

export class SharedContents extends AutomergedStore<typeof DOC_KEY, RawDocumentsType> {
  defaultValue() {
    return {
      contents: {},
      renderOrder: [],
    }
  }

  @action.bound
  moveFront(id: string) {
    const order = this.getRenderOrder(id)
    console.assert(order !== -1)

    this.change((doc) => {
      doc.renderOrder.splice(order, 1)
      doc.renderOrder.push(id)
    })
  }

  addContent(content: SharedContent) {
    this.change((doc) => {
      doc.contents[content.id] = content
      doc.renderOrder.push(content.id)
    })
  }

  getRenderOrder(id: string) {
    return this.content.renderOrder.findIndex(val => val === id)
  }

  contentChanger(id: string) {
    return (changer: AutoMerge.ChangeFn<SharedContent>) => {
      this.change(doc => changer(doc.contents[id]))
    }
  }
}

const sharedContents = new SharedContents(DOC_KEY, client)
export default sharedContents
