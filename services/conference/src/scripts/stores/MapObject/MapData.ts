import {MapObject as IMapObject} from '@models/MapObject'
import {action, observable} from 'mobx'
import {subV} from 'react-use-gesture'

export class MapData {
  @observable matrix: DOMMatrixReadOnly = new DOMMatrixReadOnly()
  @observable committedMatrix: DOMMatrixReadOnly = new DOMMatrixReadOnly()
  @observable offset: [number, number] = [0, 0]
  @observable left = 0
  @observable mouseOnMap: [number, number] = [0, 0]
  @action setMatrix(m: DOMMatrixReadOnly) {
    this.matrix = m
  }
  @action setCommittedMatrix(m: DOMMatrixReadOnly) {
    this.committedMatrix = m
  }
  @action setOffset(o:[number, number]) {
    this.offset = o
  }
  @action setLeft(l:number) {
    this.left = l
  }
  @action setMouseOnMap(m:[number, number]) {
    this.mouseOnMap[0] = m[0]
    this.mouseOnMap[1] = m[1]
  }
  @action focusOn(obj: IMapObject) {
    const im = this.matrix.inverse()
    const diff = subV(obj.pose.position, [im.e, im.f])
    const trn = new DOMMatrix().translate(-diff[0], -diff[1])
    const newMat = trn.preMultiplySelf(this.matrix)
    this.setMatrix(newMat)
    this.setCommittedMatrix(newMat)
  }
}

export default new MapData()
