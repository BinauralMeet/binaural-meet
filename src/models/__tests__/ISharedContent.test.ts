import { describe, it, expect } from 'vitest'
import {
  isContentEditable,
  isContentMaximizable,
  isContentRequireLogin,
  isContentWallpaper,
  canContentBeAWallpaper,
  isContentRtc,
  isContentOutOfRange,
  doseContentEditingUseKeyinput,
  contentsToSend,
  contentsToSave,
} from '../ISharedContent'
import type { ISharedContent } from '../ISharedContent'

// Helper to create partial content objects for testing
function makeContent(overrides: Partial<ISharedContent> = {}): ISharedContent {
  return {
    id: 'test1',
    type: 'text',
    url: '',
    name: '',
    ownerName: '',
    color: [],
    textColor: [],
    size: [200, 200] as [number, number],
    originalSize: [0, 0] as [number, number],
    zorder: Date.now(),
    pinned: false,
    pose: { position: [0, 0], orientation: 0 },
    overlapZones: [],
    surroundingZones: [],
    ...overrides,
  } as ISharedContent
}

describe('isContentEditable', () => {
  it('returns true for text', () => {
    expect(isContentEditable(makeContent({ type: 'text' }))).toBe(true)
  })

  it('returns true for iframe', () => {
    expect(isContentEditable(makeContent({ type: 'iframe' }))).toBe(true)
  })

  it('returns true for pdf', () => {
    expect(isContentEditable(makeContent({ type: 'pdf' }))).toBe(true)
  })

  it('returns true for whiteboard', () => {
    expect(isContentEditable(makeContent({ type: 'whiteboard' }))).toBe(true)
  })

  it('returns true for gdrive', () => {
    expect(isContentEditable(makeContent({ type: 'gdrive' }))).toBe(true)
  })

  it('returns true for youtube', () => {
    expect(isContentEditable(makeContent({ type: 'youtube' }))).toBe(true)
  })

  it('returns false for img', () => {
    expect(isContentEditable(makeContent({ type: 'img' }))).toBe(false)
  })

  it('returns false for screen', () => {
    expect(isContentEditable(makeContent({ type: 'screen' }))).toBe(false)
  })

  it('returns false for camera', () => {
    expect(isContentEditable(makeContent({ type: 'camera' }))).toBe(false)
  })

  it('returns false for empty string', () => {
    expect(isContentEditable(makeContent({ type: '' }))).toBe(false)
  })

  it('returns false for playbackScreen and playbackCamera', () => {
    expect(isContentEditable(makeContent({ type: 'playbackScreen' }))).toBe(false)
    expect(isContentEditable(makeContent({ type: 'playbackCamera' }))).toBe(false)
  })

  it('returns falsy for undefined (current behavior)', () => {
    expect(isContentEditable(undefined)).toBeFalsy()
  })
})

describe('isContentMaximizable', () => {
  it('returns true for iframe', () => {
    expect(isContentMaximizable(makeContent({ type: 'iframe' }))).toBe(true)
  })

  it('returns true for pdf', () => {
    expect(isContentMaximizable(makeContent({ type: 'pdf' }))).toBe(true)
  })

  it('returns true for whiteboard', () => {
    expect(isContentMaximizable(makeContent({ type: 'whiteboard' }))).toBe(true)
  })

  it('returns true for gdrive', () => {
    expect(isContentMaximizable(makeContent({ type: 'gdrive' }))).toBe(true)
  })

  it('returns true for youtube', () => {
    expect(isContentMaximizable(makeContent({ type: 'youtube' }))).toBe(true)
  })

  it('returns true for screen', () => {
    expect(isContentMaximizable(makeContent({ type: 'screen' }))).toBe(true)
  })

  it('returns true for camera', () => {
    expect(isContentMaximizable(makeContent({ type: 'camera' }))).toBe(true)
  })

  it('returns true for large img (width > 200)', () => {
    expect(isContentMaximizable(makeContent({ type: 'img', size: [300, 200] }))).toBe(true)
  })

  it('returns false for small img (width <= 200)', () => {
    expect(isContentMaximizable(makeContent({ type: 'img', size: [100, 100] }))).toBe(false)
  })

  it('returns true for large text (width > 200)', () => {
    expect(isContentMaximizable(makeContent({ type: 'text', size: [300, 200] }))).toBe(true)
  })

  it('returns false for playbackScreen and playbackCamera', () => {
    expect(isContentMaximizable(makeContent({ type: 'playbackScreen' }))).toBe(false)
    expect(isContentMaximizable(makeContent({ type: 'playbackCamera' }))).toBe(false)
  })

  it('returns falsy for undefined (current behavior)', () => {
    expect(isContentMaximizable(undefined)).toBeFalsy()
  })
})

describe('isContentRequireLogin', () => {
  it('returns true for gdrive', () => {
    expect(isContentRequireLogin(makeContent({ type: 'gdrive' }))).toBe(true)
  })

  it('returns false for other types', () => {
    expect(isContentRequireLogin(makeContent({ type: 'img' }))).toBe(false)
    expect(isContentRequireLogin(makeContent({ type: 'text' }))).toBe(false)
    expect(isContentRequireLogin(makeContent({ type: 'youtube' }))).toBe(false)
  })

  it('returns falsy for undefined (current behavior)', () => {
    expect(isContentRequireLogin(undefined)).toBeFalsy()
  })
})

describe('isContentWallpaper', () => {
  it('returns true when zorder is within TEN_YEAR range', () => {
    // TEN_YEAR = 3153600000 (in units of 100ms)
    const TEN_YEAR = 1000 * 60 * 60 * 24 * 365 * 10 / 100
    expect(isContentWallpaper(makeContent({ zorder: 0 }))).toBe(true)
    expect(isContentWallpaper(makeContent({ zorder: TEN_YEAR / 2 }))).toBe(true)
  })

  it('returns false when zorder exceeds TEN_YEAR', () => {
    const TEN_YEAR = 1000 * 60 * 60 * 24 * 365 * 10 / 100
    expect(isContentWallpaper(makeContent({ zorder: TEN_YEAR + 1 }))).toBe(false)
  })

  it('returns falsy for undefined (current behavior)', () => {
    expect(isContentWallpaper(undefined)).toBeFalsy()
  })
})

describe('canContentBeAWallpaper', () => {
  it('returns true for types other than camera and screen', () => {
    expect(canContentBeAWallpaper(makeContent({ type: 'img' }))).toBe(true)
    expect(canContentBeAWallpaper(makeContent({ type: 'text' }))).toBe(true)
    expect(canContentBeAWallpaper(makeContent({ type: 'pdf' }))).toBe(true)
  })

  it('returns false for camera', () => {
    expect(canContentBeAWallpaper(makeContent({ type: 'camera' }))).toBe(false)
  })

  it('returns false for screen', () => {
    expect(canContentBeAWallpaper(makeContent({ type: 'screen' }))).toBe(false)
  })

  it('returns falsy for undefined (current behavior)', () => {
    expect(canContentBeAWallpaper(undefined)).toBeFalsy()
  })
})

describe('isContentRtc', () => {
  it('returns true for camera', () => {
    expect(isContentRtc({ type: 'camera', name: '', ownerName: '', color: [], textColor: [] })).toBe(true)
  })

  it('returns true for screen', () => {
    expect(isContentRtc({ type: 'screen', name: '', ownerName: '', color: [], textColor: [] })).toBe(true)
  })

  it('returns false for other types', () => {
    expect(isContentRtc({ type: 'img', name: '', ownerName: '', color: [], textColor: [] })).toBe(false)
    expect(isContentRtc({ type: 'text', name: '', ownerName: '', color: [], textColor: [] })).toBe(false)
  })
})

describe('isContentOutOfRange', () => {
  it('returns true for undefined', () => {
    expect(isContentOutOfRange(undefined)).toBe(true)
  })

  it('returns true when position[0] equals CONTENT_OUT_OF_RANGE_VALUE', () => {
    const CONTENT_OUT_OF_RANGE_VALUE = 1024 * 1024
    expect(isContentOutOfRange(makeContent({
      type: 'img',
      pose: { position: [CONTENT_OUT_OF_RANGE_VALUE, 0], orientation: 0 },
    }))).toBe(true)
  })

  it('returns false for normal positions', () => {
    expect(isContentOutOfRange(makeContent({ type: 'img', pose: { position: [100, 100], orientation: 0 } }))).toBe(false)
  })
})

describe('doseContentEditingUseKeyinput', () => {
  it('returns true for text', () => {
    expect(doseContentEditingUseKeyinput(makeContent({ type: 'text' }))).toBe(true)
  })

  it('returns true for pdf', () => {
    expect(doseContentEditingUseKeyinput(makeContent({ type: 'pdf' }))).toBe(true)
  })

  it('returns false for other types', () => {
    expect(doseContentEditingUseKeyinput(makeContent({ type: 'iframe' }))).toBe(false)
    expect(doseContentEditingUseKeyinput(makeContent({ type: 'gdrive' }))).toBe(false)
    expect(doseContentEditingUseKeyinput(makeContent({ type: 'img' }))).toBe(false)
  })
})

//  Regression: contentsToSend()/contentsToSave() used to strip zIndex/playback/zones (and, for
//  Save, id) by deleting them directly on the passed-in objects. Every call site
//  (sendContentUpdateRequest, Recorder.start(), downloadItems()) passes the *same* content
//  objects that ContentStore.all/sorted -- and thus the live map rendering -- also hold onto, so
//  that in-place delete silently corrupted the on-screen content the moment it was next sent:
//  zIndex is only recomputed by ContentStore's own reactive autorun on roomContents changes, and
//  deleting a property on an object already in that Map doesn't trigger it again, so the content
//  was stuck at z-index:auto (rendering behind anything else with an explicit zIndex, e.g. a
//  wallpaper image) until some unrelated store change happened to force a fresh recompute.
describe('contentsToSend', () => {
  it('does not mutate the objects passed in', () => {
    const original = makeContent({ zIndex: 5 })
    contentsToSend([original])
    expect((original as any).zIndex).toBe(5)
  })

  it('strips zIndex/playback/zones from the returned copy', () => {
    const original = makeContent({ zIndex: 5, playback: true })
    const [sent] = contentsToSend([original])
    expect((sent as any).zIndex).toBeUndefined()
    expect((sent as any).playback).toBeUndefined()
  })

  it('keeps the original id on the returned copy', () => {
    const original = makeContent({ id: 'keep-me' })
    const [sent] = contentsToSend([original])
    expect(sent.id).toBe('keep-me')
  })
})

describe('contentsToSave', () => {
  it('does not mutate the objects passed in', () => {
    const original = makeContent({ id: 'keep-me', zIndex: 5 })
    contentsToSave([original])
    expect(original.id).toBe('keep-me')
    expect((original as any).zIndex).toBe(5)
  })

  it('strips id/zIndex/playback/zones from the returned copy', () => {
    const original = makeContent({ id: 'drop-me', zIndex: 5, playback: true })
    const [saved] = contentsToSave([original])
    expect((saved as any).id).toBeUndefined()
    expect((saved as any).zIndex).toBeUndefined()
    expect((saved as any).playback).toBeUndefined()
  })
})
