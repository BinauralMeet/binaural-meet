import {SharedObject as ISharedObject} from '@models/SharedObject'
import {Pose2DMap} from '@models/Participant'
import {Terrain} from '@models/Terrain'

import {shallowObservable, Store} from './utils'

export class SharedObject implements Store<ISharedObject> {
  url = shallowObservable<string>('')
  pose = shallowObservable<Pose2DMap>({
    position: [0, 0],
    orientation: 0,
  })
  size = shallowObservable<Terrain>({
    width: 0, height: 0
  })
}
