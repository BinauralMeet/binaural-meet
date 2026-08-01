import {describe, it, expect} from 'vitest'
import {makeEmailDisp, makeEmailInput, vrmUrlBase} from '../avatarUrl'

const COLLECTION_URL = `${vrmUrlBase}maid.vrm`

describe('makeEmailDisp', () => {
  it('abbreviates a URL into the standard collection to its file name', () => {
    expect(makeEmailDisp(COLLECTION_URL)).toBe('maid.vrm')
  })
  it('leaves a URL from anywhere else alone', () => {
    expect(makeEmailDisp('https://example.com/vrm/maid.vrm')).toBe('https://example.com/vrm/maid.vrm')
  })
  it('leaves an email address alone', () => {
    expect(makeEmailDisp('someone@example.com')).toBe('someone@example.com')
  })
})

describe('makeEmailInput', () => {
  it('expands a bare .vrm file name back into a collection URL', () => {
    expect(makeEmailInput('maid.vrm')).toBe(COLLECTION_URL)
  })
  it('stores a full URL as typed', () => {
    expect(makeEmailInput('https://example.com/vrm/maid.vrm')).toBe('https://example.com/vrm/maid.vrm')
  })
  it('does not mistake an email address for a file name', () => {
    expect(makeEmailInput('someone@example.com')).toBe('someone@example.com')
  })
  it('leaves a half-typed name alone until it looks like a .vrm file', () => {
    expect(makeEmailInput('maid.v')).toBe('maid.v')
  })
})

describe('display/input round trip', () => {
  //  The regression this guards: the field showed makeEmailDisp(email) but wrote the raw
  //  displayed text back, so pasting a collection URL left only "maid.vrm" in the store -- not
  //  a URL at all, so the avatar silently fell back to Gravatar.
  it('survives a re-render of the abbreviated value', () => {
    expect(makeEmailInput(makeEmailDisp(COLLECTION_URL))).toBe(COLLECTION_URL)
  })
  for (const value of ['https://example.com/vrm/maid.vrm', 'someone@example.com', '']) {
    it(`survives a re-render of ${value || '(empty)'}`, () => {
      expect(makeEmailInput(makeEmailDisp(value))).toBe(value)
    })
  }
})
