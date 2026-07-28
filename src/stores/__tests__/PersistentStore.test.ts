import { describe, it, expect, beforeEach } from 'vitest'
import { saveToStorage, loadFromStorage } from '../utils/PersistentStore'

describe('PersistentStore', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('round-trips a plain object through localStorage by default', () => {
    const obj = { a: 1, b: 'text' }
    saveToStorage(obj, 'testKey')
    const loaded = { a: 0, b: '' }
    loadFromStorage(loaded, 'testKey')
    expect(loaded).toEqual(obj)
  })

  it('supports an explicit storage (e.g. sessionStorage)', () => {
    const obj = { x: 42 }
    saveToStorage(obj, 'testKey', sessionStorage)
    expect(localStorage.getItem('testKey')).toBeNull()
    const loaded = { x: 0 }
    loadFromStorage(loaded, 'testKey', sessionStorage)
    expect(loaded).toEqual({ x: 42 })
  })

  it('leaves the target untouched when the key is missing', () => {
    const loaded = { a: 1, b: 'unchanged' }
    loadFromStorage(loaded, 'missingKey')
    expect(loaded).toEqual({ a: 1, b: 'unchanged' })
  })

  it('only overwrites keys present in the stored JSON', () => {
    saveToStorage({ a: 1 }, 'partialKey')
    const loaded = { a: 0, b: 'kept' }
    loadFromStorage(loaded, 'partialKey')
    expect(loaded).toEqual({ a: 1, b: 'kept' })
  })
})
