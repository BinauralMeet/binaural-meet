import {describe, it, expect} from 'vitest'
import {anyoneWantsSubtitles} from '../SttLogic'

describe('anyoneWantsSubtitles', () => {
  it('is off only when nobody is showing subtitles', () => {
    expect(anyoneWantsSubtitles(false, [{sttOn: false}, {sttOn: false}])).toBe(false)
  })
  it('is on for everyone as soon as one remote turns theirs on', () => {
    expect(anyoneWantsSubtitles(false, [{sttOn: false}, {sttOn: true}])).toBe(true)
  })
  it('is on when only I am showing them, so a lone participant still gets subtitles', () => {
    expect(anyoneWantsSubtitles(true, [])).toBe(true)
  })
})
