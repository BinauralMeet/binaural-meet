import {
  BaseSharedContent as IBaseSharedContent,
  IframeSharedContent as IIframeSharedContent,
  ImgSharedContent as IImgSharedContent,
  TextSharedContent as ITextSharedContent,
  VideoSharedContent as IVideoSharedContent,
} from '@models/sharedContent'
import {MapObject} from '@stores/MapObject'
import {observable} from 'mobx'

class BaseSharedContent<T extends IBaseSharedContent> extends MapObject implements Omit<IBaseSharedContent, 'type'> {
  readonly id: string
  readonly type: T['type']

  @observable size = [0, 0] as [number, number]
  @observable zorder = 0

  constructor(id: string, type: T['type']) {
    super()
    this.id = id
    this.type = type
  }
}

export type SharedContent = ImgSharedContent | IframeSharedContent | TextSharedContent | VideoSharedContent

export class ImgSharedContent extends BaseSharedContent<IImgSharedContent> implements IImgSharedContent {
  @observable url = ''
  constructor(id: string) {
    super(id, 'img')
  }
}

export class IframeSharedContent extends BaseSharedContent<IIframeSharedContent> implements IIframeSharedContent {
  @observable url = ''
  constructor(id: string) {
    super(id, 'iframe')
  }
}

export class TextSharedContent extends BaseSharedContent<ITextSharedContent> implements ITextSharedContent {
  @observable text = ''
  constructor(id: string) {
    super(id, 'text')
  }
}

export class VideoSharedContent extends BaseSharedContent<IVideoSharedContent> implements IVideoSharedContent {
  @observable stream = undefined
  constructor(id: string) {
    super(id, 'video')
  }
}
