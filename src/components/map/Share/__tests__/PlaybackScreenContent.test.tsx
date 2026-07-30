import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest'
import {render} from '@testing-library/react'
import {configure} from 'mobx'
import {MediaClip} from '@stores/media/MediaClip'
import {PLAYBACK_RETRY_POLL_MS} from '@models/recorder/RecorderTypes'

//  This project runs with enforceActions:'never' in its real entry point (src/index.tsx), which
//  doesn't execute in tests -- match that here so directly mutating MediaClip's @observable
//  fields (as a stand-in for "the recording engine updated the clip") doesn't warn/throw.
configure({enforceActions: 'never'})

const {playbackClips} = vi.hoisted(() => ({playbackClips: new Map<string, MediaClip>()}))
vi.mock('@stores/sharedContents/PlaybackStore', () => ({
  default: {playbackClips},
}))

//  seekMediaElement's own internals (waiting for real 'seeked'/'loadedmetadata' events) aren't
//  meaningfully exercisable in jsdom (no real media pipeline) -- that's a different unit's
//  behavior anyway. Mock it with a controllable promise so these tests focus on
//  PlaybackScreenContent's own orchestration (revision guard, play/pause branching, retry).
const {pendingSeeks} = vi.hoisted(() => ({pendingSeeks: [] as {resolve: () => void}[]}))
vi.mock('@models/utils', async (importOriginal) => {
  const actual = await importOriginal<any>()
  return {
    ...actual,
    seekMediaElement: vi.fn(() => new Promise<void>(resolve => { pendingSeeks.push({resolve}) })),
  }
})

// eslint-disable-next-line import/first
import {PlaybackScreenContent} from '../PlaybackScreenContent'

const CONTENT_ID = 'c1'

function makeProps() {
  return {
    content: {id: CONTENT_ID, type: 'playbackScreen'} as any,
    updateAndSend: () => {},
    updateOnly: () => {},
  }
}

async function flush() {
  //  Let the microtask queue (promise .then chains) drain between steps.
  await Promise.resolve()
  await Promise.resolve()
}

describe('PlaybackScreenContent', () => {
  let playSpy: ReturnType<typeof vi.spyOn>
  let pauseSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    playbackClips.clear()
    pendingSeeks.length = 0
    playSpy = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
    pauseSpy = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
    vi.stubGlobal('URL', {...URL, createObjectURL: vi.fn(() => 'blob:mock')})
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('seeks then plays when a new video blob arrives and the clip is not paused', async () => {
    const clip = new MediaClip()
    clip.videoBlob = new Blob(['x'])
    clip.videoFrom = 1000
    clip.videoTime = 500
    clip.pause = false
    playbackClips.set(CONTENT_ID, clip)

    render(<PlaybackScreenContent {...makeProps()} />)
    await flush()

    expect(pendingSeeks).toHaveLength(1)
    pendingSeeks[0].resolve()
    await flush()

    expect(playSpy).toHaveBeenCalledTimes(1)
  })

  it('pauses immediately when the clip is already playing (not mid-seek)', async () => {
    const clip = new MediaClip()
    clip.videoBlob = new Blob(['x'])
    clip.videoFrom = 1000
    clip.videoTime = 500
    clip.pause = false
    playbackClips.set(CONTENT_ID, clip)

    render(<PlaybackScreenContent {...makeProps()} />)
    await flush()
    pendingSeeks[0].resolve()
    await flush()
    expect(playSpy).toHaveBeenCalledTimes(1)

    clip.pause = true
    await flush()

    expect(pauseSpy).toHaveBeenCalledTimes(1)
  })

  //  Regression-relevant: this is the exact guard the component uses to avoid a stale seek's
  //  play() attempt clobbering a newer one -- the same class of "silent, hard to notice" bug
  //  the Player.ts seek off-by-one turned out to be this session.
  it('does not play a stale seek once a newer seek has superseded it', async () => {
    const clip = new MediaClip()
    clip.videoBlob = new Blob(['x'])
    clip.videoFrom = 1000
    clip.videoTime = 0
    clip.pause = false
    playbackClips.set(CONTENT_ID, clip)

    render(<PlaybackScreenContent {...makeProps()} />)
    await flush()
    expect(pendingSeeks).toHaveLength(1)
    const staleSeek = pendingSeeks[0]

    //  A second, newer seek request arrives before the first one resolves.
    clip.videoFrom = 2000
    await flush()
    expect(pendingSeeks).toHaveLength(2)

    //  Resolve the stale (first) seek -- its play attempt must be skipped.
    staleSeek.resolve()
    await flush()
    expect(playSpy).not.toHaveBeenCalled()

    //  Resolve the current (second) seek -- this one should play.
    pendingSeeks[1].resolve()
    await flush()
    expect(playSpy).toHaveBeenCalledTimes(1)
  })

  it('retries play() on rejection after PLAYBACK_RETRY_POLL_MS', async () => {
    vi.useFakeTimers()
    try {
      playSpy.mockRejectedValueOnce(new Error('NotAllowedError')).mockResolvedValue(undefined)

      const clip = new MediaClip()
      clip.videoBlob = new Blob(['x'])
      clip.videoFrom = 1000
      clip.videoTime = 0
      clip.pause = false
      playbackClips.set(CONTENT_ID, clip)

      render(<PlaybackScreenContent {...makeProps()} />)
      await flush()
      pendingSeeks[0].resolve()
      await flush()
      expect(playSpy).toHaveBeenCalledTimes(1)

      await vi.advanceTimersByTimeAsync(PLAYBACK_RETRY_POLL_MS)
      expect(playSpy).toHaveBeenCalledTimes(2)
    } finally {
      vi.useRealTimers()
    }
  })
})
