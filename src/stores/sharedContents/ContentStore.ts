import {ISharedContent, isContentWallpaper, TEN_YEAR, TIME_RESOLUTION_IN_MS} from '@models/ISharedContent'
import {PARTICIPANT_SIZE} from '@models/Participant'
import {getRect, isCircleInRect} from '@models/utils'
import participants from '@stores/participants/Participants'
import {action, autorun, observable, makeObservable} from 'mobx'
import {createContent} from './SharedContentCreator'
import contentSyncService from './ContentSyncService'
import playbackStore from './PlaybackStore'

export const TITLE_HEIGHT = 24

//  change zorder to the top.
export function moveContentToTop(c: ISharedContent) {
  if (isContentWallpaper(c)){
    let top = contentStore.sorted.findIndex(sc => sc.zorder > TEN_YEAR)
    if (top < 0){ top = contentStore.sorted.length }
    top -= 1
    if (top >= 0){
      const order = contentStore.sorted[top].zorder + 1
      c.zorder = order <= TEN_YEAR ? order : TEN_YEAR
    }
  }else{
    c.zorder = Math.floor(Date.now() / TIME_RESOLUTION_IN_MS)
  }
}
//  change zorder to the bottom.
export function moveContentToBottom(c: ISharedContent) {
  if (isContentWallpaper(c)){
    const bottom = contentStore.sorted[0]
    if (bottom !== c) {
      c.zorder = bottom.zorder - 1
    }
  }else{
    const bottom = contentStore.sorted.find(sc => sc.zorder > TEN_YEAR)
    if (!bottom) {
      moveContentToTop(c)
    }else{
      c.zorder = bottom.zorder - 1
    }
  }
}

function zorderComp(a:ISharedContent, b:ISharedContent) {
  return a.zorder - b.zorder
}

// Derived/view state for shared content, split out of the former
// SharedContents god-class: the observable collections components render
// from (`all`/`sorted`/`zones`/`closedZones`), reactively recomputed
// whenever ContentSyncService's roomContents or PlaybackStore's
// playbackContents change, plus paste-in-progress state and the screen-fps
// setting.
export class ContentStore {
  constructor() {
    makeObservable(this)
    const fps = localStorage.getItem('screenFps')
    if (fps){ this.screenFps = JSON.parse(fps) }
    autorun(() => { //  save screen Fps
      localStorage.setItem('screenFps', JSON.stringify(this.screenFps))
    })
    autorun(() => { //  recompute all/sorted/zones/closedZones from the two source collections
      const newAll:ISharedContent[] = []
      Object.assign(newAll, Array.from(contentSyncService.roomContents.values()))
      newAll.push(...Array.from(playbackStore.playbackContents.values()))

      const newSorted = Array.from(newAll).sort(zorderComp)
      newSorted.forEach((c, idx) => {c.zIndex = idx+1})
      //  Derive zones/closedZones from local vars, not this.sorted/this.zones:
      //  reading them back off `this` here would register them as this
      //  reaction's own dependencies, and since the same reaction also
      //  writes them, MobX detects a self-triggering cycle and kills the
      //  reaction after 100 iterations (silently freezing all these fields).
      const newZones = newSorted.filter(c => c.zone !== undefined).reverse()
      const newClosedZones = newZones.filter(c => c.zone === 'close')

      this.all = newAll
      this.sorted = newSorted
      this.zones = newZones
      this.closedZones = newClosedZones
    })
    autorun(() => { //  update audio zone of the local participant
      const pos = participants.local.pose.position
      participants.local.zone = this.zones.find(c => isCircleInRect(pos, 0.5*PARTICIPANT_SIZE, getRect(c.pose, c.size)))
      //  console.log(`sc autorun local zone:${participants.local.zone?.id}`)
    })
    autorun(() => { //  update closed audio zones of remote participants
      const closeds = this.closedZones.map(c => ({content:c, rect:getRect(c.pose, c.size)}))
      participants.remote.forEach(r => {
        if (!r.muteAudio && r.physics.located){
          const found = closeds.find(c => isCircleInRect(r.pose.position, 0.5*PARTICIPANT_SIZE, c.rect))
          r.closedZone = found?.content
        }else{
          r.closedZone = undefined
        }
      })
    })
  }

  // -----------------------------------------------------------------
  //  Contents
  //  All shared contents in Z order. Observed by component.
  @observable pasteEnabled = true
  @observable.shallow all: ISharedContent[] = []  //  all contents to display
  sorted: ISharedContent[] = []                   //  all contents sorted by zorder (bottom to top)
  @observable.shallow zones: ISharedContent[] = []        //  audio zones sorted by zorder (top to bottom)
  @observable.shallow closedZones: ISharedContent[] = []  //  closed audio zones sorted by zorder (top to bottom)

  //  pasted content
  @observable.ref pasted:ISharedContent = createContent()
  @action setPasted(c:ISharedContent) {
    console.log('setPasted:', c)
    this.pasted = c
  }
  @action sharePasted() {
    this.shareContent(this.pasted)
    this.pasted = createContent()
  }
  //  share content
  @action shareContent(content:ISharedContent) {
    moveContentToTop(content)
    contentSyncService.addLocalContent(content)
  }

  //  screen fps setting
  @observable screenFps = 5
  @action setScreenFps(fps: number){ this.screenFps = fps }
}

const contentStore = new ContentStore()
export default contentStore
export {contentStore}

declare const d:any                  //  from index.html
d.contentStore = contentStore
