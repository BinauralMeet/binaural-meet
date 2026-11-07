import {describe, it, expect, vi} from 'vitest'

vi.mock('../RtcConnection', () => ({
  RtcConnection: class {
    emit(){ return true }
    closeProducer(){ return Promise.resolve('') }
  },
}))
vi.mock('../ConnectionLog', () => ({noteConnectionEvent: () => {}}))
vi.mock('../RtcTransportStatsGot', () => ({updateTransportStat: () => {}}))

import {RtcTransports} from '../RtcTransports'

//  A send transport whose produce() resolves only when the test says so, like a reply from the
//  server that is still on its way.
function makeTransport(){
  const waiting: Array<() => void> = []
  let n = 0
  const transport = {
    produce: vi.fn((opts: any) => new Promise(resolve => {
      const producer = {
        id: `p${++n}`, appData: opts.appData, track: opts.track, closed: false,
        close(){ this.closed = true },
        replaceTrack: vi.fn((t: any) => Promise.resolve()),
        resume(){},
      }
      waiting.push(() => resolve(producer))
    })),
  }
  return {transport, release: () => { waiting.shift()?.() }}
}
function mic(id: string){
  return {track: {kind: 'audio', id, getSettings: () => ({}), stop: vi.fn()}, peer: 'me', role: 'avatar'} as any
}
const flush = () => new Promise(r => setTimeout(r, 0))

describe('RtcTransports.prepareSendTransport', () => {
  it('reuses the producer still being created instead of producing twice', async () => {
    const t = new RtcTransports() as any
    const {transport, release} = makeTransport()
    t.getSendTransport = () => Promise.resolve(transport)

    const first = t.prepareSendTransport(mic('a'))
    const second = t.prepareSendTransport(mic('b'))
    await flush()
    release()
    const [p1, p2] = await Promise.all([first, second])

    expect(transport.produce).toHaveBeenCalledTimes(1)
    expect(p2).toBe(p1)
    expect(p1.replaceTrack).toHaveBeenCalledWith(expect.objectContaining({track: expect.objectContaining({id: 'b'})}))
    expect(t.localProducers).toHaveLength(1)
  })

  it('closes a producer that was removed while it was being created', async () => {
    const t = new RtcTransports() as any
    const {transport, release} = makeTransport()
    t.getSendTransport = () => Promise.resolve(transport)
    const closeProducer = vi.spyOn(t, 'closeProducer')

    const first = t.prepareSendTransport(mic('a'))
    await flush()
    t.RemoveTrackByRole(true, 'avatar', 'audio')
    release()
    const p1 = await first
    await flush()

    expect(p1.closed).toBe(true)
    expect(closeProducer).toHaveBeenCalledWith(p1.id)
    expect(t.localProducers).toHaveLength(0)
  })

  it('removal then a new track: one producer, for the new track', async () => {
    const t = new RtcTransports() as any
    const {transport, release} = makeTransport()
    t.getSendTransport = () => Promise.resolve(transport)

    const first = t.prepareSendTransport(mic('a'))
    await flush()
    t.RemoveTrackByRole(true, 'avatar', 'audio')
    const second = t.prepareSendTransport(mic('b'))
    release()
    const p1 = await first
    await flush()
    release()
    const p2 = await second

    expect(p1.closed).toBe(true)
    expect(p2).not.toBe(p1)
    expect(p2.closed).toBe(false)
    expect(t.localProducers).toEqual([p2])
  })
})
