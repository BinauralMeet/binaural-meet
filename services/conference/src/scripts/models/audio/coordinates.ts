import {Pose as Participant2DCoordinate} from '@models/Participant'
import {Pose as Audio3DCoordinate} from './NodeGroup'

function degree2Radian(degree: number): number {
  return degree * Math.PI / 180
}

// relative pose for coordinate: position orientation direction is from positive axis x to positive axis y
export function getRelativePose(
  base: Participant2DCoordinate,
  relative: Participant2DCoordinate,
  ): Participant2DCoordinate {
  const radian = degree2Radian(base.orientation)
  const s = Math.sin(radian)
  const c = Math.cos(radian)

  const translatedPosition = [relative.position[0] - base.position[0], relative.position[1] - base.position[1]]

  const rotatedPosition: [number, number] = [
    translatedPosition[1] * s + translatedPosition[0] * c,
    translatedPosition[1] * c - translatedPosition[0] * s,
  ]

  const orientation = relative.orientation - base.orientation

  return {
    position: rotatedPosition,
    orientation: orientation < 0 ? orientation + 360 : orientation,
  }
}

export function convertToAudioCoordinate(pose: Participant2DCoordinate): Audio3DCoordinate {
  const radian = degree2Radian(pose.orientation)

  return {
    position: [pose.position[0], 0, -pose.position[1]],
    orientation: [Math.sin(radian), 0, Math.cos(radian)],
  }
}
