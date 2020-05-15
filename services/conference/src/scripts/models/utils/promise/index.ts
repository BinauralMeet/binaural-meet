export function resolveAtEnd(func: () => void): () => Promise<void> {
  return () => new Promise((resolve: () => void, reject: () => void) => {
    try {
      func()
      resolve()
    } catch (err) {
      reject()
      throw err
    }
  })
}
