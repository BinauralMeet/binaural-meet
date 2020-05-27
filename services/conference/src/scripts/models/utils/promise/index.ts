export function resolveAtEnd(func: () => void): () => Promise<void> {
  return () => new Promise((resolve: () => void, reject: (reason: any) => void) => {
    try {
      func()
      resolve()
    } catch (err) {
      reject(err)
      throw err
    }
  })
}
