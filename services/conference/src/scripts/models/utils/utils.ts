export function assert(input: any): asserts input {
  if (!input) {
    throw new Error('Not a truthy value')
  }
}

export const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor)
