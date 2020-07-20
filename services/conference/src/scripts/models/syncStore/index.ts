/**
  Synchronze changes in one store to another symmetric store

  The mobx store should have the following form:
  class Store {
    @observable prop1 = {...}
    @observable prop2 = ...
    ...
  }
  If any shallow property (e.g. prop1, prop2) have changes inside, the whole property would be copied
*/

import {toJS} from 'mobx'
import {deepObserve} from 'mobx-utils'

export function observeShallowUpdate<Store>(store: Store, onChange: (property: keyof Store) => void) {
  deepObserve(store, (change, path) => {
    if (change.type !== 'update') {
      throw new Error(`Unrecognized change type: ${change.type}`)
    }
    onChange(path.split('/')[0] as keyof Store)
  })
}

export function serialize<Store>(store: Store, propertyNames: (keyof Store)[]): Partial<Store> {
  const res: Partial<Store> = {}
  propertyNames.forEach((name) => {
    res[name] = toJS(store[name])
  })

  return res
}

export function deserialize<Store>(store: Store, change: Partial<Store>) {
  Object.assign(store, change)
}
