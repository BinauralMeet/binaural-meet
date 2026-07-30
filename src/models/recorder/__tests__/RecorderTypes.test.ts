import {describe, it, expect} from 'vitest'
import {countUpTo} from '../RecorderTypes'

describe('countUpTo', () => {
  it('returns 0 when the target is before every entry', () => {
    expect(countUpTo([10, 20, 30], 5)).toBe(0)
  })

  it('returns the full length when the target is at or after the last entry', () => {
    expect(countUpTo([10, 20, 30], 30)).toBe(3)
    expect(countUpTo([10, 20, 30], 100)).toBe(3)
  })

  it('includes entries exactly equal to the target (inclusive upper bound)', () => {
    expect(countUpTo([10, 20, 30], 20)).toBe(2)
  })

  it('counts every entry strictly before the target when seeking between two entries', () => {
    //  This is the case the previous off-by-one bug got wrong: seeking to a time strictly
    //  between two message times must include the earlier one and exclude the later one.
    expect(countUpTo([1000, 2000], 1500)).toBe(1)
    expect(countUpTo([1000, 2000, 3000], 2500)).toBe(2)
  })

  it('returns 0 for an empty array', () => {
    expect(countUpTo([], 100)).toBe(0)
  })
})
