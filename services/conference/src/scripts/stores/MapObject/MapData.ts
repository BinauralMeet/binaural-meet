import {MapObject as IMapObject} from '@models/MapObject'
import {
  addV2, rotateVector2D, subV2, transformPoint2D} from '@models/utils'
import {action, computed, observable} from 'mobx'

const HALF = 0.5
export class MapData {
  @observable matrix: DOMMatrixReadOnly = new DOMMatrixReadOnly()
  @observable committedMatrix: DOMMatrixReadOnly = new DOMMatrixReadOnly()
  @observable screenSize: [number, number] = [0, 0]
  @computed get offset(): [number, number] {
    return [-(this.left + this.screenSize[0] * HALF), -(this.screenSize[1] * HALF)]
  }
  @computed get offsetFromElement(): [number, number] {
    return [-(this.screenSize[0] * HALF), -(this.screenSize[1] * HALF)]
  }
  @observable left = 0
  @observable mouse: [number, number] = [0, 0]
  @observable mouseOnMap: [number, number] = [0, 0]
  @action setMatrix(m: DOMMatrixReadOnly) {
    this.matrix = m
  }
  @action setCommittedMatrix(m: DOMMatrixReadOnly) {
    const mouse = this.toWindow(this.mouseOnMap)
    this.committedMatrix = m
    this.mouseOnMap = this.fromWindow(mouse)
  }
  @action setScreenSize(s:[number, number]) {
    this.screenSize[0] = s[0]
    this.screenSize[1] = s[1]
  }
  @action setLeft(l:number) {
    this.left = l
  }
  @action setMouse(m:[number, number]) {
    this.mouse = addV2(m, this.offset)
    this.mouseOnMap = transformPoint2D(this.matrix.inverse(), this.mouse)
  }
  @action focusOn(obj: IMapObject) {
    const im = this.matrix.inverse()
    const diff = subV2(obj.pose.position, [im.e, im.f])
    const trn = new DOMMatrix().translate(-diff[0], -diff[1])
    const newMat = trn.preMultiplySelf(this.matrix)
    this.setMatrix(newMat)
    this.setCommittedMatrix(newMat)
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
  readonly keyInputUsers = new Set<string>()
}

export default new MapData()
