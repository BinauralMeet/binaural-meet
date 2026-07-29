import { describe, it, expect } from 'vitest'

describe('ParticipantBase information typing', () => {
  it('RemoteParticipant.information is a RemoteInformation shape by default', async () => {
    const { RemoteParticipant } = await import('../RemoteOrPlaybackParticipant')
    const p = new RemoteParticipant('remote-1')
    expect(p.information).toBeDefined()
    expect(typeof p.information.name).toBe('string')
    expect('information_' in p).toBe(false)
  })

  it('PlaybackParticipant.information is a RemoteInformation shape by default', async () => {
    const { PlaybackParticipant } = await import('../RemoteOrPlaybackParticipant')
    const p = new PlaybackParticipant('playback-1')
    expect(p.information).toBeDefined()
    expect(typeof p.information.name).toBe('string')
    expect('information_' in p).toBe(false)
  })

  it('LocalParticipant.information is a LocalInformation shape by default', async () => {
    const { LocalParticipant } = await import('../LocalParticipant')
    const p = new LocalParticipant()
    expect(p.information).toBeDefined()
    expect(typeof p.information.name).toBe('string')
    expect('information_' in p).toBe(false)
  })

  it('assigning information on one instance does not affect another', async () => {
    const { RemoteParticipant } = await import('../RemoteOrPlaybackParticipant')
    const a = new RemoteParticipant('a')
    const b = new RemoteParticipant('b')
    a.information = { ...a.information, name: 'Alice' }
    expect(a.information.name).toBe('Alice')
    expect(b.information.name).not.toBe('Alice')
  })
})
