import _ from 'lodash'
import {reaction} from 'mobx'

const OBSERVED_PROPERTIES = Symbol('observedProperties')
const GET_BUNDLED_UPDATE = Symbol('getBundledUpdate')
const APPLY_UPDATE = Symbol('applyUpdate')

interface SyncedStore<T> {
  [OBSERVED_PROPERTIES]: (keyof T)[]
  [GET_BUNDLED_UPDATE]: () => Partial<T>
  [APPLY_UPDATE]: (change: Partial<T>) => void
}

export function makeSyncedStore<T>(store: T, properties: (keyof T)[]): T & SyncedStore<T> {
  let update: Partial<T> = {}

  reaction(
    () => _.pick(store, properties),
    partial => Object.assign(GET_BUNDLED_UPDATE, partial),  // TODO: sync data
  )

  const getBundledUpdate = () => {
    const res = Object.assign({}, update)
    update = {}

    return res
  }

  return Object.assign({}, store, {
    [OBSERVED_PROPERTIES]: properties,
    [GET_BUNDLED_UPDATE]: update,
    [APPLY_UPDATE]: () => {},
  })
}
