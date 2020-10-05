import React, {useRef} from 'react'

class MemoryById<T>{
  private static statics:any [] = []
  private static nextId = 0
  private id: number

  constructor() {
    const ref = useRef<number>(-1)
    if (ref.current === -1) {
      ref.current = MemoryById.nextId
      MemoryById.nextId += 1
      MemoryById.statics[ref.current] = new Object()
      console.log(`memoObject() create a new id ${ref.current}`)
    }
    //  console.log(`MemoryById id ${ref.current}`)
    this.id = ref.current
  }
  get value() {
    return MemoryById.statics[this.id] as T
  }
}
export function memoObject<T>():T {
  return new MemoryById<T>().value
}
