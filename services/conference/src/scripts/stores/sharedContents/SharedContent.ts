import {Perceptibility, Pose2DMap} from '@models/MapObject'
import {SharedContent as ISharedContent} from '@models/SharedContent'
import {defaultValue as mapObjectDefaultValue} from '@stores/MapObject'

const defaultValue: ISharedContent = Object.assign({}, mapObjectDefaultValue, {
  type: '',
  url: '',
  size: [0, 0] as [number, number],
})

// NOTE currently SharedContent does not use observable, to change view in component, object assign is required
export class SharedContent implements ISharedContent {
  pose!: Pose2DMap
  perceptibility!: Perceptibility
  type!: string
  url!: string
  size!: [number, number]

  constructor() {
    Object.assign(this, defaultValue)
  }
}
