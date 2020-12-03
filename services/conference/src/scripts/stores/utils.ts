import {IObservable, observable} from 'mobx'

export function shallowObservable<T>(obj: T) {
  return observable(obj, {}, {deep: false})
}

export type Store<T> = {
  [K in keyof T]: T[K] | (T[K] & IObservable)
}

export function getRandomColorRGB(v:string):[number, number, number] {
  let sum = 0
  for (let i = 0; i !== v.length; i += 1) {
    sum = v.charCodeAt(i) + sum * 13
  }
  const num = sum % 0x1000
  const r = Math.floor(num / 0x100) % 0x10
  const g = Math.floor(num / 0x10) % 0x10
  const b = Math.floor(num) % 0x10

  return [r * 17, g * 17, b * 17]
}

export function getRandomColor(v:string):[string, string, string] {
  const [r2, g2, b2] = getRandomColorRGB(v)
  const [r, g, b] = [r2 / 17, g2 / 17, b2 / 17]
  const textColor = r + g + b * 0.2 > 20 ? '#008' : '#FF8'
  const color = `#${r.toString(16)}${g.toString(16)}${b.toString(16)}`
  const reverseColor = `#${(15 - r).toString(16)}${(15 - g).toString(16)}${(15 - b).toString(16)}`

  return [color, textColor, reverseColor]
}

export function rgba(rgb:number[], alpha: number) {
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`
}
