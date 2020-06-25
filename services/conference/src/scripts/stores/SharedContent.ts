import {Pose2DMap as IPose2DMap} from '@models/Participant'
import {SharedContent as ISharedContent} from '@models/SharedContent'
import {observable} from 'mobx'
import {Store} from './utils'

export class Pose2DMap implements Store<IPose2DMap>{
  @observable position:[number, number] = [0, 0]
  @observable orientation = 0
}
export class SharedContent implements Store<ISharedContent> {
  @observable type = ''
  @observable url = ''
  @observable pose:Pose2DMap = new Pose2DMap()
  @observable size: [number, number] = [0, 0]
}
