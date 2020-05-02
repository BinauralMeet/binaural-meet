import {Pose2DMap, Pose3DAudio} from '@models/Participant'

function degree2Radian(degree: number): number {
  return degree * Math.PI / 180
}

// relative pose for coordinate: position orientation direction is from positive axis x to positive axis y
export function getRelativePose(
  base: Pose2DMap,
  relative: Pose2DMap,
  ): Pose2DMap {
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

export function convertToAudioCoordinate(pose: Pose2DMap): Pose3DAudio {
  const radian = degree2Radian(pose.orientation)

  return {
    position: [pose.position[0], 0, -pose.position[1]],
    orientation: [Math.sin(radian), 0, Math.cos(radian)],
  }
}
