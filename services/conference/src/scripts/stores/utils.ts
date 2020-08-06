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

export function getRandomColor(v:string):[string, string] {
  let sum = 0
  for (let i = 0; i !== v.length; i += 1) {
    sum = v.charCodeAt(i) + sum * 13
  }
  const num = sum % 0x1000
  const color = `#${`000${num.toString(16)}`.slice(-3)}`
  const r = Math.floor(num / 0x100) % 0x10
  const g = Math.floor(num / 0x10) % 0x10
  const b = Math.floor(num) % 0x10
  const textColor = r + g + b * 0.2 > 20 ? '#000' : '#FFF'

  return [color, textColor]
}
