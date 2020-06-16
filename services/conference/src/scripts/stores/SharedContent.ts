import {SharedContent as ISharedContent} from '@models/SharedContent'
import {Pose2DMap as IPose2DMap} from '@models/Participant'
import { Store } from './utils'
import { observable } from 'mobx'

export class Pose2DMap implements Store<IPose2DMap>{
  @observable position:[number,number] = [0,0]
  @observable orientation = 0
}
export class SharedContent implements Store<ISharedContent> {
  @observable type: string = ''
  @observable url: string = ''
  @observable pose:Pose2DMap = new Pose2DMap()
  @observable size: [number,number] = [0,0]
}
