import {IObservable, observable} from 'mobx'

export function shallowObservable<T extends Object>(obj: T) {
  return observable(obj, undefined, {deep: false})
}

export type Store<T> = {
  [K in keyof T]: T[K] | (T[K] & IObservable)
}
