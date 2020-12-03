export function assert(input: any): asserts input {
  if (!input) {
    throw new Error('Not a truthy value')
  }
}

export function strcmp(a:string, b:string) {
  if (a < b) { return -1 }
  if (a > b) { return 1 }

  return 0
}

export const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor)

export function shallowEqualsForMap<T1, T2>(map1:Map<T1, T2>, map2:Map<T1, T2>) {
  let testVal
  if (map1.size !== map2.size) {
    return false
  }
  for (const [key, val] of map1) {
    testVal = map2.get(key)
    if (testVal !== val || (testVal === undefined && !map2.has(key))) {
      return false
    }
  }

  return true
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
