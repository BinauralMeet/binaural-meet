import { describe, it, expect } from 'vitest'

describe('RoomInfo color assignment', () => {
  it('can assign backgroundFill directly', async () => {
    const { default: roomInfo } = await import('../room/RoomInfo')
    
    expect(roomInfo.backgroundFill).toEqual([0xDF, 0xDB, 0xE5])
    
    const newColor: [number, number, number] = [100, 150, 200]
    roomInfo.backgroundFill = newColor
    expect(roomInfo.backgroundFill).toEqual([100, 150, 200])
    
    const sketchColor = { rgb: { r: 50, g: 100, b: 150, a: 1 } }
    roomInfo.backgroundFill = [sketchColor.rgb.r, sketchColor.rgb.g, sketchColor.rgb.b]
    expect(roomInfo.backgroundFill).toEqual([50, 100, 150])
  })
  
  it('can assign backgroundColor directly', async () => {
    const { default: roomInfo } = await import('../room/RoomInfo')
    roomInfo.backgroundColor = [200, 100, 50]
    expect(roomInfo.backgroundColor).toEqual([200, 100, 50])
  })
  
  it('can reset to defaults', async () => {
    const { default: roomInfo } = await import('../room/RoomInfo')
    roomInfo.backgroundFill = [10, 20, 30]
    roomInfo.backgroundColor = [40, 50, 60]
    roomInfo.backgroundFill = roomInfo.defaultBackgroundFill
    roomInfo.backgroundColor = roomInfo.defaultBackgroundColor
    expect(roomInfo.backgroundFill).toEqual([0xDF, 0xDB, 0xE5])
    expect(roomInfo.backgroundColor).toEqual([0xB9, 0xB2, 0xC4])
  })
})
