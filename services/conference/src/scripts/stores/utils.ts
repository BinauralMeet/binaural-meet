import {IObservable, observable} from 'mobx'

export function shallowObservable<T>(obj: T) {
  return observable(obj, {}, {deep: false})
}

export type Store<T> = {
  [K in keyof T]: T[K] | (T[K] & IObservable)
}
