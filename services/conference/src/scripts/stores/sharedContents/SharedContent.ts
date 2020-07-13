import {
  BaseSharedContent as IBaseSharedContent,
  IframeSharedContent as IIframeSharedContent,
  IFRAME_TYPE,
  ImgSharedContent as IImgSharedContent,
  IMG_TYPE,
  TextSharedContent as ITextSharedContent,
  TEXT_TYPE,
  VideoSharedContent as IVideoSharedContent,
  VIDEO_TYPE,
} from '@models/sharedContent'
import {MapObject} from '@stores/MapObject'
import {observable} from 'mobx'

abstract class BaseSharedContent extends MapObject implements Omit<IBaseSharedContent, 'type'> {
  readonly id: string

  @observable size = [0, 0] as [number, number]
  @observable zorder = 0

  constructor(id: string) {
    super()
    this.id = id
  }
}

export class ImgSharedContent extends BaseSharedContent implements IImgSharedContent {
  readonly type: typeof IMG_TYPE
  @observable url = ''
  constructor(id: string, type: typeof IMG_TYPE) {
    super(id)
    this.type = type
  }
}

export class IframeSharedContent extends BaseSharedContent implements IIframeSharedContent {
  readonly type: typeof IFRAME_TYPE
  @observable url = ''
  constructor(id: string, type: typeof IFRAME_TYPE) {
    super(id)
    this.type = type
  }
}

export class TextSharedContent extends BaseSharedContent implements ITextSharedContent {
  readonly type: typeof TEXT_TYPE
  @observable text = ''
  constructor(id: string, type: typeof TEXT_TYPE) {
    super(id)
    this.type = type
  }
}

export class VideoSharedContent extends BaseSharedContent implements IVideoSharedContent {
  readonly type: typeof VIDEO_TYPE
  stream = undefined
  constructor(id: string, type: typeof VIDEO_TYPE) {
    super(id)
    this.type = type
  }
}
