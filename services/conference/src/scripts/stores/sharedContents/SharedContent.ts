import {uploadToGyazo} from '@models/api/Gyazo'
import {defaultPerceptibility, Perceptibility,  Pose2DMap} from '@models/MapObject'
import {SharedContent as ISharedContent} from '@models/SharedContent'
import {defaultValue as mapObjectDefaultValue} from '@stores/MapObject'
import {MapData} from '@stores/MapObject/MapData'
import _ from 'lodash'

const defaultValue: ISharedContent = Object.assign({}, mapObjectDefaultValue, {
  name: '',
  type: '',
  url: '',
  size: [0, 0] as [number, number],
  id: '',
  zorder: 0,
  pinned: false,
})
export class SharedContent implements ISharedContent {
  name!: string
  type!: string
  url!: string
  id!: string
  zorder!: number
  pinned!: boolean
  pose!: Pose2DMap
  size!: [number, number]
  perceptibility!: Perceptibility
  constructor() {
    Object.assign(this, _.cloneDeep(defaultValue))
  }
}

export function createContentOfIframe(urlStr: string, map: MapData) {
  const pasted = new SharedContent()
  const url = new URL(urlStr)
  if (url.hostname === 'youtu.be' || url.hostname === 'youtube.com' || url.hostname === 'www.youtube.com') {
    let ytId = ''
    if (url.hostname === 'youtu.be') {
      ytId = url.pathname.slice(1)
    }else {
      // tslint:disable-next-line: no-magic-numbers
      const ytVStart = url.search.slice(url.search.search(/\?v=/) + 3)
      const end = ytVStart.search(/\&/)
      ytId = (end === -1) ? ytVStart : ytVStart.slice(0, end)
      console.log(`ytVStart = ${ytVStart} end=${end}`)
    }
    console.log(`youtube Id = ${ytId}`)
    pasted.url = `https://www.youtube.com/embed/${ytId}`
    pasted.type = 'youtube'
    pasted.pose.position[0] = map.mouseOnMap[0]
    pasted.pose.position[1] = map.mouseOnMap[1]
    const YT_WIDTH = 640
    const YT_HEIGHT = 380
    pasted.size[0] = YT_WIDTH
    pasted.size[1] = YT_HEIGHT
  }else {  //  generic iframe
    pasted.type = 'iframe'
    pasted.url = urlStr
    pasted.pose.position[0] = map.mouseOnMap[0]
    pasted.pose.position[1] = map.mouseOnMap[1]
    const IFRAME_WIDTH = 600
    const IFRAME_HEIGHT = 800
    pasted.size[0] = IFRAME_WIDTH
    pasted.size[1] = IFRAME_HEIGHT
  }

  return pasted
}
export function createContentOfText(text: string, map: MapData) {
  const pasted = new SharedContent()
  pasted.type = 'text'
  pasted.url = text
  pasted.pose.position[0] = map.mouseOnMap[0]
  pasted.pose.position[1] = map.mouseOnMap[1]
  const slen = Math.sqrt(text.length)
  const STRING_SCALE_W = 20
  const STRING_SCALE_H = 15
  pasted.size[0] = slen * STRING_SCALE_W
  pasted.size[1] = slen * STRING_SCALE_H

  return pasted
}
export function createContentOfImage(imageFile: File, map: MapData, offset?:[number, number]): Promise<SharedContent> {
  const IMAGESIZE_LIMIT = 500
  const promise = new Promise<SharedContent>((resolutionFunc, rejectionFunc) => {
    uploadToGyazo(imageFile).then(({url, size}) => {
      // console.log("mousePos:" + (global as any).mousePositionOnMap)
      const pasted = new SharedContent()
      pasted.type = 'img'
      pasted.url = url
      const max = size[0] > size[1] ? size[0] : size [1]
      const scale = max > IMAGESIZE_LIMIT ? IMAGESIZE_LIMIT / max : 1
      pasted.size[0] = size[0] * scale
      pasted.size[1] = size[1] * scale
      const CENTER = 0.5
      for (let i = 0; i < pasted.pose.position.length; i += 1) {
        if (offset) {
          pasted.pose.position[i] = map.mouseOnMap[i] + offset[i]
        }else {
          pasted.pose.position[i] = map.mouseOnMap[i] - CENTER * pasted.size[i]
        }
      }
      resolutionFunc(pasted)
    })
  })

  return promise
}
