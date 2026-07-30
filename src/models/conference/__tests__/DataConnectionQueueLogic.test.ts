import {describe, it, expect} from 'vitest'
import {findQueueSlot} from '../DataConnectionQueueLogic'
import {BMMessage} from '../DataMessage'

function msg(overrides: Partial<BMMessage> = {}): BMMessage {
  return {t: 'x', v: '', ...overrides}
}

describe('findQueueSlot', () => {
  it('finds an existing queued message of the same type/room/peer/dest to merge into', () => {
    const queue = [msg({t: 'p_afk', v: 'true'})]
    expect(findQueueSlot(queue, msg({t: 'p_afk', v: 'false'}), 'overwrite', undefined)).toBe(0)
  })

  it('does not match a message of a different type', () => {
    const queue = [msg({t: 'p_afk', v: 'true'})]
    expect(findQueueSlot(queue, msg({t: 'ma', v: '1'}), 'overwrite', undefined)).toBe(-1)
  })

  it('does not match a message with a different dest', () => {
    const queue = [msg({t: 'm_chat', v: '{}', d: 'peerA'})]
    expect(findQueueSlot(queue, msg({t: 'm_chat', v: '{}', d: 'peerB'}), 'overwrite', undefined)).toBe(-1)
  })

  //  Regression test: a rapid burst of chat messages must never collapse into one before a
  //  flush -- see DataConnectionQueueLogic.ts and the commit that fixed this.
  it('merge="instant" never finds a slot, even for an identical message', () => {
    const queue = [msg({t: 'm_chat', v: '{"msg":"hello"}'})]
    const idx = findQueueSlot(queue, msg({t: 'm_chat', v: '{"msg":"hello"}'}), 'instant', undefined)
    expect(idx).toBe(-1)
  })

  //  Regression test: ROOM_PROP multiplexes many differently-named properties under one message
  //  type, so two different properties queued back-to-back (e.g. backgroundFill then
  //  backgroundColor) must not collide on the same slot and clobber each other.
  it('with a roomPropName, only matches a queued ROOM_PROP message for the same property', () => {
    const queue = [msg({t: 'room_prop', v: JSON.stringify(['backgroundFill', '#fff'])})]
    expect(findQueueSlot(queue, msg({t: 'room_prop', v: '?'}), 'overwrite', 'backgroundFill')).toBe(0)
    expect(findQueueSlot(queue, msg({t: 'room_prop', v: '?'}), 'overwrite', 'backgroundColor')).toBe(-1)
  })

  it('treats a queued ROOM_PROP message with unparsable v as not matching', () => {
    const queue = [msg({t: 'room_prop', v: 'not json'})]
    expect(findQueueSlot(queue, msg({t: 'room_prop', v: '?'}), 'overwrite', 'backgroundFill')).toBe(-1)
  })

  it('returns -1 for an empty queue', () => {
    expect(findQueueSlot([], msg(), 'overwrite', undefined)).toBe(-1)
  })
})
