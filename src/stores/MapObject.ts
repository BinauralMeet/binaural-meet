import {MapObject as IMapObject, Perceptibility, Pose2DMap} from '@models/MapObject'
import {MAP_CENTER} from '@models/MapObject'
import _ from 'lodash'
import { makeObservable, observable} from 'mobx'
import {shallowObservable, Store} from './utils'

export const defaultValue: IMapObject = {
  pose: {
    position: [MAP_CENTER[0], MAP_CENTER[1]],
    orientation: 0,
  },
  perceptibility: {
    visibility: true,
    coreContentVisibility: true,
    audibility: true,
  },
}

export class MapObject implements Store<IMapObject> {
  @observable pose: (Pose2DMap)
  // perceptibility is influenced by distance, determines whether the participant would be rendered or not
  @observable perceptibility: Perceptibility

  constructor() {
    this.pose = _.cloneDeep(defaultValue.pose)
    this.perceptibility = defaultValue.perceptibility
    makeObservable(this)
  }

  static fromPlain(obj: IMapObject) {
    const store = new MapObject()
    store.pose = shallowObservable(_.cloneDeep(obj.pose))
    store.perceptibility = shallowObservable(obj.perceptibility)
  }
}
