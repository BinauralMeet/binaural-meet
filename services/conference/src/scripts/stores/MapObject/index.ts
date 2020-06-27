import {MapObject as IMapObject, Perceptibility, Pose2DMap} from '@models/MapObject'
import {shallowObservable, Store} from '../utils'

export class MapObject implements Store<IMapObject> {
  pose = shallowObservable<Pose2DMap>({
    position: [0, 0],
    orientation: 0,
  })
  // perceptibility is influenced by distance, determines whether the participant would be rendered or not
  perceptibility = shallowObservable<Perceptibility>({
    visibility: true,
    audibility: true,
  })

  static fromPlain(obj: IMapObject) {
    const store = new MapObject()
    store.pose = shallowObservable(obj.pose)
    store.perceptibility = shallowObservable(obj.perceptibility)
  }
}
