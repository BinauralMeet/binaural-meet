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

  protected getObservedProperties(): (keyof T)[] {
    return ['pose', 'size']
  }
}

export type SharedContent = ImgSharedContent | IframeSharedContent | TextSharedContent | VideoSharedContent

export class ImgSharedContent extends BaseSharedContent<IImgSharedContent> implements IImgSharedContent {
  @observable url = ''
  constructor(id: string) {
    super(id, 'img')
  }

  protected getObservedProperties(): (keyof IImgSharedContent)[] {
    return super.getObservedProperties().splice(0, 0, 'url')
  }
}

export class IframeSharedContent extends BaseSharedContent<IIframeSharedContent> implements IIframeSharedContent {
  @observable url = ''
  constructor(id: string) {
    super(id, 'iframe')
  }

  protected getObservedProperties(): (keyof IIframeSharedContent)[] {
    return super.getObservedProperties().splice(0, 0, 'url')
  }
}

export class TextSharedContent extends BaseSharedContent<ITextSharedContent> implements ITextSharedContent {
  @observable text = ''
  constructor(id: string) {
    super(id, 'text')
  }

  protected getObservedProperties(): (keyof ITextSharedContent)[] {
    return super.getObservedProperties().splice(0, 0, 'text')
  }
}

export class VideoSharedContent extends BaseSharedContent<IVideoSharedContent> implements IVideoSharedContent {
  @observable stream = undefined
  constructor(id: string) {
    super(id, 'video')
  }

  protected getObservedProperties(): (keyof IVideoSharedContent)[] {
    return super.getObservedProperties().splice(0, 0, 'stream')
  }
}
