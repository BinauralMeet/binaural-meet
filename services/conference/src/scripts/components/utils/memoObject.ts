import React, {useState} from 'react'

class MemoryById<T>{
  private static statics:any [] = []
  private static map = new Map<Object, number>()
  private id: number

  constructor() {
    const [temp] = useState(new Object())
    let id = MemoryById.map.get(temp)
    if (!id) {
      id = MemoryById.map.size + 1
      MemoryById.map.set(temp, id)
      MemoryById.statics[id] = new Object()
      console.log(`create new id = ${id}`)
    }
    this.id = id
  }
  get value() {
    return MemoryById.statics[this.id] as T
  }
}
export function memoObject<T>():T {
  return new MemoryById<T>().value
}
