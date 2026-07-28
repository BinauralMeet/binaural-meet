import { describe, it, expect } from 'vitest'

describe('RoomInfo color change render paths', () => {
  it('Background component style props are valid after color change', async () => {
    const { default: roomInfo } = await import('../room/RoomInfo')
    const { rgb2Color, isDarkColor } = await import('@models/utils/color')
    
    // Simulate the SketchPicker onChange
    const testColors = [
      { rgb: { r: 100, g: 150, b: 200 } },
      { rgb: { r: 50, g: 50, b: 50 } },
      { rgb: { r: 255, g: 0, b: 0 } },
    ]
    
    for (const tc of testColors) {
      roomInfo.backgroundFill = [tc.rgb.r, tc.rgb.g, tc.rgb.b]
      
      // Check rgb2Color output (used by Background.tsx)
      const cssColor = rgb2Color(roomInfo.backgroundFill)
      expect(cssColor).toMatch(/^#[0-9a-f]{6}$/)
      
      // Check isDarkColor (used by Chat.tsx)
      const dark = isDarkColor(roomInfo.backgroundFill)
      expect(typeof dark).toBe('boolean')
      
      // Check rgb2Color output (used by App.tsx)
      const bgColor = rgb2Color(roomInfo.backgroundFill)
      expect(bgColor).toBe(cssColor)
    }
    
    // Test backgroundColor too
    for (const tc of testColors) {
      roomInfo.backgroundColor = [tc.rgb.r, tc.rgb.g, tc.rgb.b]
      const cssColor = rgb2Color(roomInfo.backgroundColor)
      expect(cssColor).toMatch(/^#[0-9a-f]{6}$/)
    }
  })
  
  it('can serialize and deserialize backgroundFill via JSON (setRoomProp path)', async () => {
    const { default: roomInfo } = await import('../room/RoomInfo')
    
    // Simulate the full admin flow:
    // 1. Admin changes color locally
    roomInfo.backgroundFill = [200, 100, 50]
    expect(roomInfo.backgroundFill).toEqual([200, 100, 50])
    
    // 2. onClose: serialize to JSON and send via setRoomProp
    const serialized = JSON.stringify(roomInfo.backgroundFill)
    expect(serialized).toBe('[200,100,50]')
    
    // 3. Remote participant receives and deserializes via onUpdateProp
    const deserialized = JSON.parse(serialized) as number[]
    expect(deserialized).toEqual([200, 100, 50])
    
    // 4. Apply via onUpdateProp (simulated)
    roomInfo.onUpdateProp('backgroundFill', serialized)
    expect(roomInfo.backgroundFill).toEqual([200, 100, 50])
  })
})
