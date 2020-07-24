import * as AutoMerge from 'automerge'
import AutomergeClient from 'automerge-client'

export class ClientAdapter<T extends RawDocuments> {
  private client: AutomergeClient

  constructor(socket: WebSocket, docs: T) {
    const data: {[key: string]: AutoMerge.Doc<any>} = {}
    for (const docId in docs) {
      data[docId] = AutoMerge.from(docs[docId])
    }

    this.client = new AutomergeClient({
      socket,
      savedData: data,
    })
  }

  getDoc<K extends keyof T>(id: K) {
    console.assert(typeof id === 'string')

    return this.client.docs[id as string] as AutoMerge.Doc<T[K]>
  }

  change<K extends keyof T>(id: K, changer: AutoMerge.ChangeFn<T[K]>) {
    console.assert(typeof id === 'string')

    this.client.change(id as string, changer)
  }
}

export interface RawDocuments {
  [key: string]: any
}
