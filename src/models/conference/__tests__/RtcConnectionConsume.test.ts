import {describe, it, expect, vi, afterEach} from 'vitest'

const {noteConnectionEvent} = vi.hoisted(() => ({noteConnectionEvent: vi.fn()}))
vi.mock('../ConnectionLog', () => ({noteConnectionEvent, clientEnvironment: () => ({}),
  describeClose: () => '', takeConnectionEvents: () => []}))
vi.mock('../RtcTransportStatsGot', () => ({RtcTransportStatsGot: class {}}))

import {RtcConnection} from '../RtcConnection'

describe('RtcConnection.consumeTransport', () => {
  afterEach(() => { vi.useRealTimers() })

  //  The media server answers a consume of a producer that has just closed with an error; the
  //  request must fail right then, not run into the reply timeout (and its reconnect).
  it('rejects at once on an error reply and does not time out later', async () => {
    vi.useFakeTimers()
    const c = new RtcConnection() as any
    const sent: any[] = []
    c.mainServer = {readyState: WebSocket.OPEN, send: (s: string) => sent.push(JSON.parse(s)), close: () => {}}
    c.connected = true
    c.device = {rtpCapabilities: {}}
    const disconnect = vi.spyOn(c, 'disconnect').mockImplementation(() => Promise.resolve())

    const result = c.consumeTransport('t1', {id: 'gone', peer: {peer: 'b'}}).then(
      () => 'resolved', (e: any) => `rejected: ${e}`)
    expect(sent).toHaveLength(1)
    const {rtpCapabilities, remote, ...reply} = sent[0]
    c.rtcQueue.push({...reply, error: 'consume for gone failed'})
    c.scheduleProcessMessage()
    await vi.advanceTimersByTimeAsync(1)
    expect(await result).toBe('rejected: consume for gone failed')

    await vi.advanceTimersByTimeAsync(30 * 1000)
    expect(noteConnectionEvent).not.toHaveBeenCalledWith('requestTimeout', 'consumeTransport')
    expect(disconnect).not.toHaveBeenCalled()
  })
})
