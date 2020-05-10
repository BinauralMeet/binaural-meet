import {Pose2DMap, Pose3DAudio} from '@models/Participant'

export function degree2Radian(degree: number): number {
  return degree * Math.PI / 180
}

export function radian2Degree(radian: number): number {
  return radian * 180 / Math.PI
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

export function transformPoint2D(
  matrix: DOMMatrixReadOnly | DOMMatrix, point: [number, number]): [number, number] {
  return [
    matrix.a * point[0] + matrix.c * point[1] + matrix.e,
    matrix.b * point[0] + matrix.d * point[1] + matrix.f,
  ]
}

export function rotateVector2D(
  matrix: DOMMatrixReadOnly | DOMMatrix, point: [number, number]): [number, number] {
  return [
    matrix.a * point[0] + matrix.c * point[1],
    matrix.b * point[0] + matrix.d * point[1],
  ]
}

export function multiply(matrix: (DOMMatrix | DOMMatrixReadOnly)[]) {
  return matrix.reduce((p: DOMMatrix, c) => p.multiplySelf(c), new DOMMatrix())
}

export function extractScaleX(matrix: DOMMatrix | DOMMatrixReadOnly) {
  return Math.sign(matrix.a) * Math.sqrt(Math.pow(matrix.a, 2) + Math.pow(matrix.c, 2))
}

export function extractScaleY(matrix: DOMMatrix | DOMMatrixReadOnly) {
  return Math.sign(matrix.d) * Math.sqrt(Math.pow(matrix.b, 2) + Math.pow(matrix.d, 2))
}

export function extractScale(matrix: DOMMatrix | DOMMatrixReadOnly): [number, number] {
  return [
    extractScaleX(matrix),
    extractScaleY(matrix),
  ]
}

export function extractRotation(matrix: DOMMatrix | DOMMatrixReadOnly): number {
  return Math.atan2(-matrix.c, matrix.a)
}
