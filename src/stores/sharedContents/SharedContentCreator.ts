import {defaultPerceptibility,  Perceptibility, Pose2DMap} from '@models/MapObject'
import {ContentType, SharedContent as ISharedContent,
  SharedContentData as ISharedContentData} from '@models/SharedContent'
import {defaultValue as mapObjectDefaultValue} from '@stores/MapObject'
import _ from 'lodash'
import participants from '../participants/Participants'

const TIME_RESOLUTION_IN_MS = 100
export const TEN_YEAR = 1000 * 60 * 60 * 24 * 365 * 10 / TIME_RESOLUTION_IN_MS
export const defaultContent: ISharedContent = Object.assign({}, mapObjectDefaultValue, {
  name: '',
  ownerName: '',
  color: [],
  textColor: [],
  type: '' as ContentType,
  url: '',
  size: [0, 0] as [number, number],
  originalSize: [0, 0] as [number, number],
  id: '',
  zorder: 0,
  pinned: false,
  noFrame: false,
})

///  Add perceptibility and function to object obtained by JSON.parse()
export function jsonToContents(json: string, perceptibility = defaultPerceptibility) {
  const cs = JSON.parse(json)
  for (const c of cs) {
    c.perceptibility = Object.assign({}, defaultPerceptibility)
  }

  return cs as ISharedContent[]
}

export function makeItContent(it: ISharedContentData) {
  const sc = it as ISharedContent
  sc.perceptibility = Object.assign({}, defaultPerceptibility)

  return sc
}
export function makeThemContents(them: ISharedContent[]) {
  for (const c of them) {
    makeItContent(c)
  }

  return them
}

export class SharedContent implements ISharedContent {
  name!: string
  ownerName!: string
  color!: number[]
  textColor!: number[]
  type!: ContentType
  url!: string
  id!: string
  zorder!: number
  pinned!: boolean
  noFrame!: boolean
  pose!: Pose2DMap
  size!: [number, number]
  originalSize!:[number, number]
  perceptibility!: Perceptibility
  constructor() {
    Object.assign(this, _.cloneDeep(defaultContent))
  }
}

export function createContent() {
  const content = new SharedContent()
  content.ownerName = participants.local.information.name
  content.color = participants.local.information.color
  content.textColor = participants.local.information.textColor
  content.zorder = Date.now()

  return content
}
