import {Perceptibility, Pose2DMap} from '@models/MapObject'
import {SharedContent as ISharedContent} from '@models/SharedContent'
import {defaultValue as mapObjectDefaultValue} from '@stores/MapObject'

const defaultValue: ISharedContent = Object.assign({}, mapObjectDefaultValue, {
  type: '',
  url: '',
  size: [0, 0] as [number, number],
  id: '',
  zorder: 0,
  pinned: false,
})

// NOTE currently SharedContent does not use observable, to change view in component, object assign is required
export class SharedContent implements ISharedContent {
  id = ''
  zorder = 0
  pose!: Pose2DMap
  perceptibility!: Perceptibility
  type!: string
  url!: string
  size!: [number, number]
  pinned = false

  constructor() {
    Object.assign(this, defaultValue)
  }
}
