import {SharedContent as ISharedContent} from '@models/SharedContent'
import {MapObject} from '@stores/MapObject'
import {observable} from 'mobx'
import {Store} from '../utils'

export class SharedContent extends MapObject implements Store<ISharedContent> {
  @observable type = ''
  @observable url = ''
  @observable size: [number, number] = [0, 0]

  // static fromPlain(content: ISharedContent): SharedContent {
  //   const superStore = MapObject.fromPlain(content)
  //   const store = observable
  //   return observable(content)
  // }
}
