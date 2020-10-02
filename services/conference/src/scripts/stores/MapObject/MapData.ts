import {action, observable} from 'mobx'

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
    this.mouseOnMap = m
  }
}

export default new MapData()
