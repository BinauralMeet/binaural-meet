import { describe, it, expect } from 'vitest'

describe('RemoteOrPlaybackParticipant shared behavior', () => {
  it('RemoteParticipant starts with the expected zone/distance/call defaults', async () => {
    const { RemoteParticipant } = await import('../RemoteParticipant')
    const p = new RemoteParticipant('remote-1')
    expect(p.called).toBe(false)
    expect(p.inLocalsZone).toBe(false)
    expect(p.closedZone).toBeUndefined()
    expect(p.lastDistance).toBe(0)
  })

  it('PlaybackParticipant starts with the same zone/distance/call defaults', async () => {
    const { PlaybackParticipant } = await import('../PlaybackParticipant')
    const p = new PlaybackParticipant('playback-1')
    expect(p.called).toBe(false)
    expect(p.inLocalsZone).toBe(false)
    expect(p.closedZone).toBeUndefined()
    expect(p.lastDistance).toBe(0)
  })

  it('call() sets called=true on both', async () => {
    const { RemoteParticipant } = await import('../RemoteParticipant')
    const { PlaybackParticipant } = await import('../PlaybackParticipant')
    const r = new RemoteParticipant('r')
    const p = new PlaybackParticipant('p')
    r.call()
    p.call()
    expect(r.called).toBe(true)
    expect(p.called).toBe(true)
  })

  it('inLocalsZone/closedZone/lastDistance are independent per instance', async () => {
    const { RemoteParticipant } = await import('../RemoteParticipant')
    const a = new RemoteParticipant('a')
    const b = new RemoteParticipant('b')
    a.inLocalsZone = true
    a.lastDistance = 42
    expect(b.inLocalsZone).toBe(false)
    expect(b.lastDistance).toBe(0)
  })

  it('RemoteParticipant has tracks, PlaybackParticipant has clip (not each other\'s)', async () => {
    const { RemoteParticipant } = await import('../RemoteParticipant')
    const { PlaybackParticipant } = await import('../PlaybackParticipant')
    const r = new RemoteParticipant('r')
    const p = new PlaybackParticipant('p')
    expect(r.tracks).toBeDefined()
    expect((r as any).clip).toBeUndefined()
    expect(p.clip).toBeUndefined()
    expect((p as any).tracks).toBeUndefined()
  })
})
