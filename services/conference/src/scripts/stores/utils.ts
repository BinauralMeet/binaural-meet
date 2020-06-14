import {IObservable, observable} from 'mobx'

export function shallowObservable<T>(obj: T) {
  return observable(obj, {}, {deep: false})
}

export type Store<T> = {
  [K in keyof T]: T[K] | (T[K] & IObservable)
}

declare global {
  interface Map<K,V> {
      /** set difference */
      diff(b: Map<K,V>): Map<K,V>;
  }
}
Map.prototype.diff = function(b) {
  var diff = new Map(this);
  for (var elem of b) {
      diff.delete(elem[0]);
  }
  return diff;
}
