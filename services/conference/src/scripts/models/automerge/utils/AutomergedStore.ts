import * as AutoMerge from 'automerge'
import {observable} from 'mobx'
import {ClientAdapter, RawDocuments} from './ClientAdapter'

export abstract class AutomergedStore<K extends keyof T, T extends RawDocuments> {
  @observable.ref content: AutoMerge.Doc<T[K]>

  private client: ClientAdapter<T>

  constructor(docId: K, client: ClientAdapter<T>) {
    this.client = client

    this.client.initDoc(docId, this.defaultValue())
    this.content = client.getDoc(docId)
  }

  change<K extends keyof T>(id: K, changer: AutoMerge.ChangeFn<T[K]>) {
    this.client.change(id, changer)
  }

  abstract defaultValue(): T[K]
}
