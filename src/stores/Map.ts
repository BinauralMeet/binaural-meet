import {ISharedContent} from '@models/ISharedContent'
import {MapObject as IMapObject} from '@models/MapObject'
import { PARTICIPANT_SIZE } from '@models/Participant'
import {
  addV2, extractRotation, extractScaleX, radian2Degree, rotateVector2D, subV2, transformPoint2D} from '@models/utils'
import {TITLE_HEIGHT} from '@stores/sharedContents/SharedContents'
import {action, computed, makeObservable, observable} from 'mobx'
import { participants } from '.'

export const SCALE_LIMIT = {
  minScale: 0.2,
  maxScale: 5,
}

const HALF = 0.5
export class MapData {
  constructor() {
    makeObservable(this)
    this.loadMatrixFromStorage()
  }

  @observable matrix: DOMMatrixReadOnly = new DOMMatrixReadOnly()
  @observable committedMatrix: DOMMatrixReadOnly = new DOMMatrixReadOnly()
  @observable matrixBeforeZoom?:DOMMatrixReadOnly
  @observable screenSize: [number, number] = [0, 0]   //  size of the client window of the map
  @computed get offset(): [number, number] {
    return [-(this.left + this.screenSize[0] * HALF), -(this.screenSize[1] * HALF)]
  }
  @computed get offsetFromElement(): [number, number] {
    return [-(this.screenSize[0] * HALF), -(this.screenSize[1] * HALF)]
  }
  @computed get rotation(): number {
    return radian2Degree(extractRotation(this.committedMatrix))
  }
  @computed get scale():number{
    return extractScaleX(this.matrix)
  }
  @observable left = 0
  @observable mouse: [number, number] = [0, 0]
  @observable mouseOnMap: [number, number] = [0, 0]
  @action setMatrix(m: DOMMatrixReadOnly) {
    this.matrix = m
    this.updateViewpoint(m)
  }
  private updateViewpoint(m: DOMMatrixReadOnly){
    const scale = extractScaleX(m)
    const width = this.screenSize[0] / scale
    participants.local.viewpoint.height = width
    participants.local.updateViewpointCenter(this)
  }
  @action setCommittedMatrix(m: DOMMatrixReadOnly) {
    const mouse = this.toWindow(this.mouseOnMap)
    this.committedMatrix = m
    this.mouseOnMap = this.fromWindow(mouse)
    this.saveMatrixToStorage(false)
    this.matrixBeforeZoom = undefined
    this.updateViewpoint(m)
  }
  @action setScreenSize(s:[number, number]) {   //  size of the client window of the map
    this.screenSize[0] = s[0]
    this.screenSize[1] = s[1]
    this.updateViewpoint(this.committedMatrix)
  }
  @action setLeft(l:number) {
    this.left = l
  }
  @action setMouse(m:[number, number]) {
    this.mouse = addV2(m, this.offset)
    this.mouseOnMap = transformPoint2D(this.matrix.inverse(), this.mouse)
  }
  @action focusOn(obj: IMapObject, offset?:number[]) {
    const im = this.matrix.inverse()
    const pos = offset ? addV2(obj.pose.position, offset) :  obj.pose.position
    const diff = subV2(pos, [im.e, im.f])
    const trn = new DOMMatrix().translate(-diff[0], -diff[1])
    const newMat = trn.preMultiplySelf(this.matrix)
    this.setMatrix(newMat)
    this.setCommittedMatrix(newMat)
  }
  @action zoomTo(content: ISharedContent){
    const matrixOrg = this.matrix
    const contentSize = Array.from(content.size)
    contentSize[1] += TITLE_HEIGHT
    const scales = [map.screenSize[0] / contentSize[0], map.screenSize[1] / contentSize[1]]
    const newScale = Math.max(Math.min(scales[0], scales[1], SCALE_LIMIT.maxScale), SCALE_LIMIT.minScale)
    const oldScale = extractScaleX(matrixOrg)

    const im = matrixOrg.inverse()
    const diff = subV2(content.pose.position, [im.e, im.f])

    const left = contentSize[0] / 2
    const top = (this.screenSize[1] / newScale) / 2 - TITLE_HEIGHT
    const trn = new DOMMatrix().translate(-diff[0] - left, -diff[1] - top)


    const newMat = trn.preMultiplySelf(matrixOrg).preMultiplySelf(new DOMMatrix().scale(newScale/oldScale))
    console.log(`newScale:${newScale} old${oldScale}  newMat scaleX=${extractScaleX(newMat)}`)
    this.setMatrix(newMat)
    this.setCommittedMatrix(newMat)
    this.matrixBeforeZoom = matrixOrg
    console.log(`zoomTo: before: ${this.matrixBeforeZoom}`)
  }
  @action restoreZoom(){
    if (this.matrixBeforeZoom){
      this.setMatrix(this.matrixBeforeZoom)
      this.setCommittedMatrix(this.matrixBeforeZoom)
    }
  }
  @computed get zoomed(){
    return this.matrixBeforeZoom !== undefined
  }
  @computed get centerOnMap(){
    return transformPoint2D(this.matrix.inverse(), [0,0])
  }
  centerLimit(){
    //console.log(`scale: ${extractScaleX(map.matrix)}, psize:${participantSize}`)
    //const participantSize = 0.7 *  PARTICIPANT_SIZE * extractScaleX(this.matrix)
    const participantSize = 2 *  PARTICIPANT_SIZE * extractScaleX(this.matrix)
    const ratioX = Math.min(participantSize / this.screenSize[0], 0.3)
    const ratioY = Math.min(participantSize / this.screenSize[1], 0.3)
    const left = map.left + map.screenSize[0] * ratioX
    const right = map.left + map.screenSize[0] * (1 - ratioX)
    const bottom = map.screenSize[1] * (1 - ratioY)
    const top = participants.local.thirdPersonView ? map.screenSize[1] * ratioY : bottom
    return {left, top, right, bottom}
  }

  isInCenter(pos?:[number, number]){
    if (!pos) pos = participants.local.pose.position
    pos = map.toWindow(pos)
    const limit = this.centerLimit()
    return limit.left<=pos[0] && pos[0] < limit.right && limit.top <= pos[1] && pos[1] <= limit.bottom
  }

  toWindow(pos:[number, number]) {
    return subV2(transformPoint2D(this.matrix, pos), this.offset)
  }
  fromWindow(pos:[number, number]) {
    return transformPoint2D(this.matrix.inverse(), addV2(pos, this.offset))
  }
  toElement(pos:[number, number]) {
    return subV2(transformPoint2D(this.matrix, pos), this.offsetFromElement)
  }
  rotateFromWindow(pos:[number, number]) {
    return rotateVector2D(this.matrix.inverse(), pos)
  }
  rotateToWindow(pos:[number, number]) {
    return rotateVector2D(this.matrix, pos)
  }
  visibleArea(){
    const lt = this.fromWindow([0,0])
    const rb = this.fromWindow(this.screenSize)
    const margin = PARTICIPANT_SIZE
//    console.log(`visibleArea ${lt}, ${rb}`)

    return [lt[1] - margin, rb[0] + margin, rb[1] + margin, lt[0] - margin]
  }
  readonly keyInputUsers = new Set<string>()

  saveMatrixToStorage(isLocalStorage: boolean) {
    let storage = sessionStorage
    if (isLocalStorage) { storage = localStorage }
    const ar = [this.matrix.a, this.matrix.b, this.matrix.c, this.matrix.d, this.matrix.e, this.matrix.f]
    storage.setItem('mapMatrix', JSON.stringify(ar))
  }
  @action loadMatrixFromStorage() {
    let storage = localStorage
    if (sessionStorage.getItem('mapMatrix')) {
      storage = sessionStorage
    }
    const str = storage.getItem('mapMatrix')
    if (str) {
      const ar = JSON.parse(str)
      const newMat = new DOMMatrix()
      newMat.a = ar[0]
      newMat.b = ar[1]
      newMat.c = ar[2]
      newMat.d = ar[3]
      newMat.e = ar[4]
      newMat.f = ar[5]
      this.setMatrix(newMat)
      this.setCommittedMatrix(newMat)
      //console.log(`loadMatrixFromStorage() loaded.`)
    }
  }
}

const map = new MapData()
declare const d:any
d.map = map
export default map
