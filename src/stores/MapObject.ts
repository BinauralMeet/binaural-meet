import {MAP_CENTER} from '@components/Constants'
import {MapObject as IMapObject} from '@models/MapObject'
import {Pose2DMap} from '@models/utils'
import _ from 'lodash'
import { makeObservable, observable} from 'mobx'
import {Store} from './utils'

export const defaultValue: IMapObject = {
  pose: {
    position: [MAP_CENTER[0], MAP_CENTER[1]],
    orientation: 0,
  },
}

export class MapObject implements Store<IMapObject> {
  @observable pose: Pose2DMap

  constructor() {
    this.pose = _.cloneDeep(defaultValue.pose)
    makeObservable(this)
  }

}


export class MediaClip{
  @observable.ref videoBlob?: Blob
  videoTime = 0
  @observable.ref audioBlob?: Blob
  audioTime = 0
  @observable audioDuration = 0
  @observable videoFrom = 0
  @observable audioFrom = 0
  @observable rate = 1
  @observable pause = false
  constructor(){
    makeObservable(this)
  }
}
