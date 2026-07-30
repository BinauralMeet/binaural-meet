import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { contentTypeIcons, editButtonTip } from '../contentUtils'

//  Content.tsx pulls in the full store graph transitively (YouTube/GDrive/PDF/ScreenContent/...,
//  contentSyncService -> @stores/participants -> eventually StereoManager, which needs a real
//  browser AudioContext jsdom doesn't provide). Mock every renderer and contentSyncService so
//  this suite exercises only Content's own memoization, not the whole app singleton graph.
vi.mock('../YouTube', () => ({ YouTube: () => null }))
vi.mock('../GDrive', () => ({ GDrive: () => null }))
vi.mock('../PDF', () => ({ PDF: () => null }))
vi.mock('../PlaybackScreenContent', () => ({ PlaybackScreenContent: () => null }))
vi.mock('../ScreenContent', () => ({ ScreenContent: () => null }))
vi.mock('../Text', () => ({ Text: () => null }))
vi.mock('@stores/', () => ({ contentSyncService: { editing: '' } }))

// eslint-disable-next-line import/first
import { Content } from '../Content'

function makeContent(overrides: Partial<any> = {}): any {
  return {
    id: 'c1', type: 'unknown-test-type' as any, url: 'v1',
    pose: { position: [0, 0], orientation: 0 }, size: [10, 10], originalSize: [10, 10],
    zorder: 1, pinned: false, name: '', ownerName: '', color: '#fff', textColor: '#000',
    overlapZones: [], surroundingZones: [],
    ...overrides,
  }
}

describe('Content', () => {
  //  Regression test for a bug where Content was wrapped in an outer React.memo whose
  //  comparator only checked `content.id` (stable across any update to the same content) --
  //  that always reported props as "equal" and permanently blocked re-renders, shadowing this
  //  component's own, correctly-scoped useMemo dependency list before it ever ran. In practice
  //  this silently broke propagation of any remote content update that doesn't change identity
  //  (e.g. a YouTube seek/pause/rate change, a `url`-only update) to every other participant.
  it('re-renders when url changes on the same content id', () => {
    const {rerender, getByText} = render(<Content
      content={makeContent({url: 'v1'})} updateAndSend={() => {}} updateOnly={() => {}} />)
    getByText(/for v1/)

    rerender(<Content
      content={makeContent({url: 'v2'})} updateAndSend={() => {}} updateOnly={() => {}} />)
    getByText(/for v2/)
  })
})

describe('contentTypeIcons', () => {
  it('returns an icon element for each known type', () => {
    const types: string[] = [
      'img', 'text', 'iframe', 'youtube', 'screen',
      'gdrive', 'whiteboard', 'camera', 'pdf',
      'playbackScreen', 'playbackCamera',
    ]
    for (const type of types) {
      const icon = contentTypeIcons(type as any)
      expect(icon).toBeDefined()
    }
  })

  it('returns undefined for empty type string', () => {
    expect(contentTypeIcons('')).toBeUndefined()
  })

  it('accepts custom size and width', () => {
    const icon = contentTypeIcons('img', 24, 30)
    expect(icon).toBeDefined()
  })
})

describe('editButtonTip', () => {
  it('returns correct tip for whiteboard when editing', () => {
    expect(editButtonTip(true, { type: 'whiteboard' } as any)).toBe('ctEndEditWhiteboard')
  })

  it('returns correct tip for whiteboard when not editing', () => {
    expect(editButtonTip(false, { type: 'whiteboard' } as any)).toBe('ctEditWhiteboard')
  })

  it('returns correct tip for gdrive when editing', () => {
    expect(editButtonTip(true, { type: 'gdrive' } as any)).toBe('ctEndEditGDrive')
  })

  it('returns correct tip for youtube when editing', () => {
    expect(editButtonTip(true, { type: 'youtube' } as any)).toBe('ctEndEditYoutube')
  })

  it('returns correct tip for iframe when not editing', () => {
    expect(editButtonTip(false, { type: 'iframe' } as any)).toBe('ctEditIframe')
  })

  it('returns correct tip for text when not editing', () => {
    expect(editButtonTip(false, { type: 'text' } as any)).toBe('ctEditText')
  })

  it('returns empty string for img', () => {
    expect(editButtonTip(false, { type: 'img' } as any)).toBe('')
  })

  it('returns empty string for screen', () => {
    expect(editButtonTip(false, { type: 'screen' } as any)).toBe('')
  })

  it('returns empty string when content is undefined', () => {
    expect(editButtonTip(false, undefined)).toBe('')
  })
})
