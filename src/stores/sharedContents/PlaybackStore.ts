import {ISharedContent} from '@models/ISharedContent'
import {MediaClip} from '@stores/media/MediaClip'
import {action, observable, makeObservable} from 'mobx'
import _ from 'lodash'
import {defaultContent} from './SharedContentCreator'

// Recorded-clip playback content, split out of the former SharedContents
// god-class. Fully independent of the sync/RTC/view-collection concerns --
// ContentStore reads playbackContents to include playback items in its
// derived `all`/`sorted` view, but nothing here needs to know about that.
export class PlaybackStore {
  constructor() {
    makeObservable(this)
  }

  @observable.shallow playbackContents = new Map<string, ISharedContent>()
  @observable.deep playbackClips = new Map<string, MediaClip>()  //  cid -> clip

  @action updatePlayback(content: ISharedContent){
    content.playback = true
    this.playbackContents.set(content.id, content)
  }
  @action removePlayback(cid: string){
    this.playbackClips.delete(cid)
    this.playbackContents.delete(cid)
  }
  findPlayback(cid: string){
    return this.playbackContents.get(cid)
  }
  getOrCreatePlayback(cid: string): ISharedContent{
    let rv = this.findPlayback(cid)
    if (!rv){
      rv = _.cloneDeep(defaultContent)
      rv.id = cid
      this.playbackContents.set(cid, rv)
    }
    return rv
  }
  getOrCreatePlaybackClip(cid: string): MediaClip{
    let rv = this.playbackClips.get(cid)
    if (!rv){
      rv = new MediaClip()
      this.playbackClips.set(cid, rv)
    }
    return rv
  }
}

const playbackStore = new PlaybackStore()
export default playbackStore

declare const d:any                  //  from index.html
d.playbackStore = playbackStore
