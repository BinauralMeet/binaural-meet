import {describe, it, expect} from 'vitest'
import {stepLoadLevel, makeHysteresisState, CONFIRM_WORSEN_MS, CONFIRM_RECOVER_MS, combineLimit} from '../LoadAdjusterLogic'

describe('stepLoadLevel', () => {
  it('stays at the same level when raw matches current', () => {
    const state = makeHysteresisState()
    expect(stepLoadLevel(state, 0, 0)).toBe(0)
    expect(state.candidate).toBeUndefined()
  })

  it('does not step up before the worsen confirm window elapses', () => {
    const state = makeHysteresisState()
    expect(stepLoadLevel(state, 1, 0)).toBe(0)
    expect(stepLoadLevel(state, 1, CONFIRM_WORSEN_MS - 1)).toBe(0)
  })

  it('steps up by one level once the worsen confirm window elapses', () => {
    const state = makeHysteresisState()
    stepLoadLevel(state, 1, 0)
    expect(stepLoadLevel(state, 1, CONFIRM_WORSEN_MS)).toBe(1)
  })

  it('only steps one level at a time even if raw jumps by more than one', () => {
    const state = makeHysteresisState()
    stepLoadLevel(state, 3, 0)
    expect(stepLoadLevel(state, 3, CONFIRM_WORSEN_MS)).toBe(1)
  })

  it('keeps stepping up towards a sustained higher raw level', () => {
    const state = makeHysteresisState()
    let now = 0
    stepLoadLevel(state, 3, now)
    now += CONFIRM_WORSEN_MS
    expect(stepLoadLevel(state, 3, now)).toBe(1)
    now += CONFIRM_WORSEN_MS
    expect(stepLoadLevel(state, 3, now)).toBe(2)
    now += CONFIRM_WORSEN_MS
    expect(stepLoadLevel(state, 3, now)).toBe(3)
  })

  it('resets the confirm window if the raw level flickers before it elapses', () => {
    const state = makeHysteresisState()
    stepLoadLevel(state, 1, 0)
    stepLoadLevel(state, 0, CONFIRM_WORSEN_MS - 1)    //  back to current level -- clears candidate
    expect(stepLoadLevel(state, 1, CONFIRM_WORSEN_MS)).toBe(0)   //  window restarts from here
    expect(stepLoadLevel(state, 1, CONFIRM_WORSEN_MS - 1 + CONFIRM_WORSEN_MS)).toBe(0)  //  not yet a full window since restart
    expect(stepLoadLevel(state, 1, CONFIRM_WORSEN_MS + CONFIRM_WORSEN_MS)).toBe(1)      //  now a full window has elapsed
  })

  it('requires the much longer recover window before stepping down', () => {
    const state = makeHysteresisState()
    state.current = 2
    expect(stepLoadLevel(state, 0, 0)).toBe(2)
    expect(stepLoadLevel(state, 0, CONFIRM_RECOVER_MS - 1)).toBe(2)
    expect(stepLoadLevel(state, 0, CONFIRM_RECOVER_MS)).toBe(1)
  })

  it('recovers one level at a time, each requiring its own confirm window', () => {
    const state = makeHysteresisState()
    state.current = 2
    let now = 0
    stepLoadLevel(state, 0, now)
    now += CONFIRM_RECOVER_MS
    expect(stepLoadLevel(state, 0, now)).toBe(1)
    //  immediately after stepping down, the new candidate window has just started
    expect(stepLoadLevel(state, 0, now)).toBe(1)
    now += CONFIRM_RECOVER_MS
    expect(stepLoadLevel(state, 0, now)).toBe(0)
  })
})

describe('combineLimit', () => {
  it('returns unlimited (-1) when both the room policy and the auto limit are unlimited', () => {
    expect(combineLimit(-1, Infinity)).toBe(-1)
  })

  it('never loosens an unlimited auto limit into a room limit', () => {
    expect(combineLimit(5, Infinity)).toBe(5)
  })

  it('applies the auto limit alone when the room policy is unlimited', () => {
    expect(combineLimit(-1, 3)).toBe(3)
  })

  it('takes the smaller of the two when both restrict', () => {
    expect(combineLimit(5, 3)).toBe(3)
    expect(combineLimit(2, 3)).toBe(2)
  })
})
