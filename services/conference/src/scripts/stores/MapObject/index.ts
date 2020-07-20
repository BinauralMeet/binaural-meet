import {MapObject as IMapObject, Perceptibility, Pose2DMap} from '@models/MapObject'
import {observable} from 'mobx'
import {shallowObservable, Store} from '../utils'

export const defaultValue: IMapObject = {
  pose: {
    position: [0, 0],
    orientation: 0,
  },
  perceptibility: {
    visibility: true,
    coreContentVisibility: true,
    audibility: true,
  },
}

export class MapObject implements Store<IMapObject> {
  @observable.shallow pose: Pose2DMap = defaultValue.pose
  // perceptibility is influenced by distance, determines whether the participant would be rendered or not
  @observable.shallow perceptibility: Perceptibility = defaultValue.perceptibility
}
