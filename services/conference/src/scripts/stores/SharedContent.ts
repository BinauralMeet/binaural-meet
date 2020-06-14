import {SharedContent as ISharedContent} from '@models/SharedContent'
import {Pose2DMap} from '@models/Participant'
import {Terrain} from '@models/Terrain'

import {shallowObservable, Store} from './utils'

export class SharedContent implements Store<ISharedContent> {
  type: string = ''
  url: string = ''
  pose:Pose2DMap = {
    position: [0, 0],
    orientation: 0,
  }
  size: [number,number] = [0,0]
  constructor() {
  }
}
