import {SharedContent as ISharedContent} from '@models/SharedContent'
import {Pose2DMap} from '@models/Participant'
import {Terrain} from '@models/Terrain'

import {shallowObservable, Store} from './utils'
import { observable } from 'mobx'

export class SharedContent implements Store<ISharedContent> {
  type: string = ''
  url: string = ''
  @observable.shallow pose:Pose2DMap = {
    position: [0, 0],
    orientation: 0,
  }
  @observable.shallow size: [number,number] = [0,0]
  constructor() {
  }
}
