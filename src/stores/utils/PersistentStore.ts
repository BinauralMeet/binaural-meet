export function saveToStorage(obj: object, key: string, storage: Storage = localStorage): void {
  storage.setItem(key, JSON.stringify(obj))
}

export function loadFromStorage(obj: object, key: string, storage: Storage = localStorage): void {
  const str = storage.getItem(key)
  if (str) {
    Object.assign(obj, JSON.parse(str))
  }
}
