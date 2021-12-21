export interface Pose2DMap {
  position: [number, number]
  orientation: number
}
export function clonePose2DMap(p:Pose2DMap):Pose2DMap{
  return {position:[p.position[0], p.position[1]], orientation:p.orientation}
}
export function cloneV2(v:number[]):[number, number]{
  return [v[0], v[1]]
}

export interface Pose3DAudio {  // right hand cartesian coordinate system
  position: [number, number, number],
  orientation: [number, number, number],
}

export function addV2(a:number[], b:number[]): [number, number] {
  return [a[0] + b[0], a[1] + b[1]]
}
export function subV2(a:number[], b:number[]): [number, number] {
  return [a[0] - b[0], a[1] - b[1]]
}
export function mulV<S extends number, T extends number[]>(s: S, v: T): T {
  return v.map(e => s*e) as T
}
export function mulV2(a:number, v:number[]): [number, number] {
  return [a * v[0], a * v[1]]
}
export function mulV3(a:number, v:number[]): [number, number, number] {
  return [a * v[0], a * v[1], a * v[2]]
}
export function normV(v:number[]): number {
  let sum = 0
  v.forEach(e => sum += e * e)

  return Math.sqrt(sum)
}

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

export function rotateVector2DByDegree(
  degree: number, vector: [number, number]): [number, number] {
  const rad = degree * (Math.PI / 180)
  const c = Math.cos(rad)
  const s = Math.sin(rad)

  return [
    c * vector[0] - s * vector[1],
    s * vector[0] + c * vector[1],
  ]
}


export function crossProduct(vec1: [number, number], vec2: [number, number]): number {
  return vec1[0] * vec2[0] + vec1[1] * vec2[1]
}

export function vectorLength(vec: [number, number]): number {
  return Math.sqrt(vec.reduce((pre, val) => pre + val * val, 0))
}

export function rotate90ClockWise(vec: [number, number]): [number, number] {
  return [vec[1], -vec[0]]
}


export function square(s: number) {
  return s * s
}

//  rect or circle
export type Shape = [number, number, number, number] | [number, number, number]

//  rect: [top, right, bottom, left]
export function getRect(pose: Pose2DMap, size: [number, number]):[number, number, number, number]{
  if (pose.orientation === 0){
    return [pose.position[1], pose.position[0] + size[0], pose.position[1] + size[1], pose.position[0]]
  }
  const lt = rotateVector2DByDegree(pose.orientation, pose.position)
  const vr = rotateVector2DByDegree(pose.orientation, [size[0], 0])
  const vb = rotateVector2DByDegree(pose.orientation, [0, size[1]])
  const xs = [lt[0], lt[0]+vr[0], lt[0]+vb[0], lt[0]+vr[0]+vb[0]]
  const ys = [lt[1], lt[1]+vr[1], lt[1]+vb[1], lt[1]+vr[1]+vb[1]]
  xs.sort((a,b) => a-b)
  ys.sort((a,b) => a-b)

  return [ys[0], xs[3], ys[3], xs[0]]
}

export function isOverlapped(a:number[], b:number[]){
  if (a[0] > b[2] || a[2] < b[0]) { return false }
  if (a[3] > b[1] || a[1] < b[3]) { return false }

  return true
}
export function isOverlappedToCircle(rect:number[], circle:number[]){
  if (isInRect(circle as [number, number], rect)){ return true }
  const d2 = Math.min(square(rect[3] - circle[0]), square(rect[1] - circle[0]))
    + Math.min(square(rect[0] - circle[1]), square(rect[2] - circle[1]))

  return d2 < square(circle[2])
}

export function isInRect(point: [number, number], rect:number[]){
  return rect[3] <= point[0] && point[0] <= rect[1]
    && rect[0] <= point[1] && point[1] <= rect[2]
}
export function isCircleInRect(point: [number, number], radius:number, rect:number[]){
  return rect[3] <= point[0]-radius && point[0]+radius <= rect[1]
    && rect[0] <= point[1]-radius && point[1]+radius <= rect[2]
}
export function isInCircle(point: [number, number], circle:number[]){
  const d2 = square(point[0] - circle[0]) + square(point[1] - circle[1])

  return d2 <= square(circle[2])
}

export interface Mouse{
  position:[number, number]
  show: boolean
}

function round(n:number){
  return Math.round(n*100) / 100
}
export function pose2Str(pose:Pose2DMap){
  return `${round(pose.position[0])},${round(pose.position[1])},${round(pose.orientation)}`
}
export function mouse2Str(mouse: Mouse){
  return `${mouse.position[0]},${mouse.position[1]},${mouse.show?'t':''}`
}
export function str2Pose(str:string){
  const poseArray = str.split(',')
  const pose:Pose2DMap = {position:[Number(poseArray[0]), Number(poseArray[1])] as [number, number],
    orientation:Number(poseArray[2])}

  return pose
}
export function str2Mouse(str:string){
  const mouseArray = str.split(',')
  const mouse:Mouse = {position:[Number(mouseArray[0]),Number(mouseArray[1])], show: mouseArray[2] ? true : false}

  return mouse
}
