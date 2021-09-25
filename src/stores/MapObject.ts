import {MAP_CENTER} from '@components/Constants'
import {MapObject as IMapObject} from '@models/MapObject'
import {Pose2DMap} from '@models/utils'
import _ from 'lodash'
import { makeObservable, observable} from 'mobx'
import {shallowObservable, Store} from './utils'

export const defaultValue: IMapObject = {
  pose: {
    position: [MAP_CENTER[0], MAP_CENTER[1]],
    orientation: 0,
  },
}

export class MapObject implements Store<IMapObject> {
  @observable pose: (Pose2DMap)

  constructor() {
    this.pose = _.cloneDeep(defaultValue.pose)
    makeObservable(this)
  }

  static fromPlain(obj: IMapObject) {
    const store = new MapObject()
    store.pose = shallowObservable(_.cloneDeep(obj.pose))
  }
}
