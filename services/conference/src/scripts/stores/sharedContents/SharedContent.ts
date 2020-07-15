import {PropTypes} from '@material-ui/core'
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

export class ImgSharedContent extends BaseSharedContent<IImgSharedContent> implements IImgSharedContent {
  @observable url = ''
}

export class IframeSharedContent extends BaseSharedContent<IIframeSharedContent> implements IIframeSharedContent {
  @observable url = ''
}

export class TextSharedContent extends BaseSharedContent<ITextSharedContent> implements ITextSharedContent {
  @observable text = ''
}

export class VideoSharedContent extends BaseSharedContent<IVideoSharedContent> implements IVideoSharedContent {
  @observable stream = undefined
}
