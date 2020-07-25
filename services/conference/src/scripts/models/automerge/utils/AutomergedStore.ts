import * as AutoMerge from 'automerge'
import {action, observable} from 'mobx'
import {ClientAdapter, RawDocuments} from './ClientAdapter'

export abstract class AutomergedStore<K extends keyof T, T extends RawDocuments> {
  @observable.ref content: AutoMerge.Doc<T[K]>

  private client: ClientAdapter<T>
  private docId: K

  constructor(docId: K, client: ClientAdapter<T>) {
    this.client = client
    this.docId = docId

    this.client.initDoc(docId, this.defaultValue())
    this.content = client.getDoc(docId)
  }

  @action.bound
  change(changer: AutoMerge.ChangeFn<T[K]>) {
    this.client.change(this.docId, changer)
  }

  abstract defaultValue(): T[K]
}
