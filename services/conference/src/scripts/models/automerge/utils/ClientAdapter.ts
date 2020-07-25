import * as AutoMerge from 'automerge'
import AutomergeClient from 'automerge-client'

export class ClientAdapter<T extends RawDocuments> {
  private client: AutomergeClient

  private _fullInitialized = false

  constructor(socket: WebSocket) {
    this.client = new AutomergeClient({
      socket,
      savedData: {},
      onChange: this.onChange,  // remote change
    })
  }

  initDoc<K extends keyof T>(id: K, defaultValue: T[K], onChange: (newDoc: AutoMerge.Doc<T[K]>) => void) {
    console.assert(typeof id === 'string')
    const idStr = id as string
    console.assert(this.client.docs[idStr] === undefined, `Doc - ${idStr} already exists`)

    this.client.docs[idStr] = AutoMerge.from(defaultValue)
    this.client.subscribe([idStr])
    this.docChangedLoopUp[id] = onChange
  }

  getDoc<K extends keyof T>(id: K) {
    console.assert(typeof id === 'string')
    console.assert(this.client.docs[id as string] !== undefined)

    return this.client.docs[id as string] as AutoMerge.Doc<T[K]>
  }

  change<K extends keyof T>(id: K, changer: AutoMerge.ChangeFn<T[K]>) {
    console.assert(typeof id === 'string')
    console.assert(this.client.docs[id as string] !== undefined)
    const idStr = id as string

    this.client.change(idStr, changer)
    this.onChange(idStr, this.client.docs[idStr]) // local change
  }

  // all docs specified in T have beend inited throught initDoc
  private get fullInitialized() {
    if (this._fullInitialized) {
      return true
    }

    if (Object.keys(this.client.docs).some(key => this.client.docs[key] === undefined)) {
      return false
    }

    this._fullInitialized = true

    return true
  }

  private docChangedLoopUp: {
    [K in keyof T]?: (newDoc: AutoMerge.Doc<T[K]>) => void
  } = {}
  private onChange = <K extends keyof T>(docId: K, newDoc: AutoMerge.Doc<T[K]>) => {
    this.docChangedLoopUp[docId]?.call(null, newDoc)
  }
}

export interface RawDocuments {
  [key: string]: any
}
