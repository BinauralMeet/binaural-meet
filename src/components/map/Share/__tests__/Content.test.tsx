import { describe, it, expect } from 'vitest'
import { contentTypeIcons, editButtonTip } from '../contentUtils'

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
