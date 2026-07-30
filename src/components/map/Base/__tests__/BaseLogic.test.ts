import {describe, it, expect} from 'vitest'
import {limitScale, thirdPersonViewRotationAngle} from '../BaseLogic'

describe('limitScale', () => {
  const MIN = 0.2
  const MAX = 5

  it('returns the proposed scale unchanged when the result stays within bounds', () => {
    expect(limitScale(1, 2, MIN, MAX)).toBe(2)
  })

  it('clamps the multiplier so current*scale does not exceed maxScale', () => {
    //  currentScale=3, scale=2 -> target=6 > max(5) -> should clamp to max/current
    expect(limitScale(3, 2, MIN, MAX)).toBeCloseTo(MAX / 3)
  })

  it('clamps the multiplier so current*scale does not go below minScale', () => {
    //  currentScale=1, scale=0.1 -> target=0.1 < min(0.2) -> should clamp to min/current
    expect(limitScale(1, 0.1, MIN, MAX)).toBeCloseTo(MIN / 1)
  })

  it('allows landing exactly on the boundary', () => {
    expect(limitScale(1, MAX, MIN, MAX)).toBe(MAX)
    expect(limitScale(1, MIN, MIN, MAX)).toBe(MIN)
  })

  it('handles a currentScale already at the limit with a scale that would push further', () => {
    //  already at max; any zoom-in multiplier > 1 should be clamped back to 1 (no further zoom)
    expect(limitScale(MAX, 1.5, MIN, MAX)).toBeCloseTo(1)
  })
})

//  Characterization tests: lock down Base.tsx's current re-leveling behavior on thirdPersonView
//  toggle as-is. The render-body store mutation this feeds (rather than a useEffect) is a known,
//  separately-flagged concern -- intentionally not addressed here, see the UI test coverage plan.
describe('thirdPersonViewRotationAngle', () => {
  it('entering third-person view cancels out the map\'s own rotation', () => {
    expect(thirdPersonViewRotationAngle(true, 30, 999)).toBe(-30)
  })

  it('entering third-person view is a no-op when the map is already upright', () => {
    expect(thirdPersonViewRotationAngle(true, 0, 999)).toBeUndefined()
  })

  it('leaving third-person view cancels out the map rotation plus the avatar facing', () => {
    expect(thirdPersonViewRotationAngle(false, 30, 20)).toBe(-50)
  })

  it('leaving third-person view is a no-op when the combined orientation is already upright', () => {
    //  avatarRot + mapRot === 0 (e.g. 30 and -30) -- no rotation needed
    expect(thirdPersonViewRotationAngle(false, -30, 30)).toBeUndefined()
  })
})
