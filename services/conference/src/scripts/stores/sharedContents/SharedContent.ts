import {uploadToGyazo} from '@models/api/Gyazo'
import {defaultPerceptibility, Perceptibility,  Pose2DMap} from '@models/MapObject'
import {SharedContent as ISharedContent} from '@models/SharedContent'
import {defaultValue as mapObjectDefaultValue} from '@stores/MapObject'
import _ from 'lodash'

const defaultValue: ISharedContent = Object.assign({}, mapObjectDefaultValue, {
  type: '',
  url: '',
  size: [0, 0] as [number, number],
  id: '',
  zorder: 0,
  pinned: false,
})
export class SharedContent implements ISharedContent {
  type!: string
  url!: string
  id!: string
  zorder!:number
  pinned!: boolean

  pose!: Pose2DMap
  perceptibility!: Perceptibility
  size!: [number, number]

  constructor() {
    Object.assign(this, defaultValue)
    this.size = [0, 0]
    // this.pose = {position:[defaultValue.pose.position[0], defaultValue.pose.position[1]] as [number, number],
    //  orientation: 0}
    this.perceptibility = Object.assign({}, defaultPerceptibility)
  }
}
export function createContentOfIframe(url: string) {
  const pasted = new SharedContent()
  pasted.type = 'iframe'
  pasted.url = url
  pasted.pose.position = _.cloneDeep((global as any).mousePositionOnMap)
  const IFRAME_WIDTH = 600
  const IFRAME_HEIGHT = 800
  pasted.size[0] = IFRAME_WIDTH
  pasted.size[1] = IFRAME_HEIGHT

  return pasted
}
export function createContentOfText(text: string) {
  const pasted = new SharedContent()
  pasted.type = 'text'
  pasted.url = text
  pasted.pose.position = _.cloneDeep((global as any).mousePositionOnMap)
  const slen = Math.sqrt(text.length)
  const STRING_SCALE_W = 20
  const STRING_SCALE_H = 15
  pasted.size[0] = slen * STRING_SCALE_W
  pasted.size[1] = slen * STRING_SCALE_H

  return pasted
}
export function createContentOfImage(imageFile: File, offset?:[number, number]): Promise<SharedContent> {
  const promise = new Promise<SharedContent>((resolutionFunc, rejectionFunc) => {
    uploadToGyazo(imageFile).then(({url, size}) => {
      // console.log("mousePos:" + (global as any).mousePositionOnMap)
      const pasted = new SharedContent()
      pasted.type = 'img'
      pasted.url = url
      const max = size[0] > size[1] ? size[0] : size [1]
      const scale = max > 500 ? 500 / max : 1
      pasted.size[0] = size[0] * scale
      pasted.size[1] = size[1] * scale
      const CENTER = 0.5
      for (let i = 0; i < pasted.pose.position.length; i += 1) {
        if (offset) {
          pasted.pose.position[i] = (global as any).mousePositionOnMap[i] + offset[i]
        }else {
          pasted.pose.position[i] = (global as any).mousePositionOnMap[i] - CENTER * pasted.size[i]
        }
      }
      resolutionFunc(pasted)
    })
  })

  return promise
}
