import {IObservable, observable} from 'mobx'

export function shallowObservable<T>(obj: T) {
  return observable(obj, {}, {deep: false})
}

export type Store<T> = {
  [K in keyof T]: T[K] | (T[K] & IObservable)
}

/// a - b for two maps
export function diffMap<K, V1, V2>(a:Map<K, V1>, b:Map<K, V2>) {
  const diff = new Map<K, V1>(a)
  for (const elem of b) {
    diff.delete(elem[0])
  }

  return diff
}

/// a - b for two sets
export function diffSet<K>(a:Set<K>, b:Set<K>) {
  const diff = new Set<K>(a)
  for (const elem of b) {
    diff.delete(elem)
  }

  return diff
}
