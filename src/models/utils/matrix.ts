export function multiply(matrix: (DOMMatrix | DOMMatrixReadOnly)[]) {
  return matrix.reduce((p: DOMMatrix, c) => p.multiplySelf(c), new DOMMatrix())
}

export function extractScaleX(matrix: DOMMatrix | DOMMatrixReadOnly) {
  return Math.abs(Math.sign(matrix.a) * Math.sqrt(Math.pow(matrix.a, 2) + Math.pow(matrix.c, 2)))
}

export function extractScaleY(matrix: DOMMatrix | DOMMatrixReadOnly) {
  return Math.abs(Math.sign(matrix.d) * Math.sqrt(Math.pow(matrix.b, 2) + Math.pow(matrix.d, 2)))
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

export function transfromAt(center:[number, number], tranform: DOMMatrixReadOnly, baseMatrix:DOMMatrixReadOnly) {
  const tm = (new DOMMatrix()).translate(-center[0], -center[1])
  const itm = (new DOMMatrix()).translateSelf(...center)
  const newMatrix = multiply([itm, tranform, tm, baseMatrix])

  return newMatrix
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
