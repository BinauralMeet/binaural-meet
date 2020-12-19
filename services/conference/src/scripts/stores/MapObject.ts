import {MAP_CENTER} from '@components/map/Base'
import {MapObject as IMapObject, Perceptibility, Pose2DMap} from '@models/MapObject'
import _ from 'lodash'
import {IObservableObject} from 'mobx'
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
  pose: Pose2DMap & IObservableObject
  // perceptibility is influenced by distance, determines whether the participant would be rendered or not
  perceptibility: Perceptibility & IObservableObject

  constructor() {
    this.pose = shallowObservable(_.cloneDeep(defaultValue.pose))
    this.perceptibility = shallowObservable(defaultValue.perceptibility)
  }

  static fromPlain(obj: IMapObject) {
    const store = new MapObject()
    store.pose = shallowObservable(_.cloneDeep(obj.pose))
    store.perceptibility = shallowObservable(obj.perceptibility)
  }
}
