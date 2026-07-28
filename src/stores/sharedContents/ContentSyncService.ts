import {ISharedContent, SharedContentInfo} from '@models/ISharedContent'
import {default as participantsStore} from '@stores/participants/Participants'
import participants from '@stores/participants/Participants'
import {action, observable, makeObservable} from 'mobx'
import {ContentSyncTransport} from './ContentSyncTransport'
import contentTrackStore from './ContentTrackStore'

// Local CRUD + remote sync for shared content, split out of the former
// SharedContents god-class. Owns `roomContents`/`roomContentsInfo` (the raw
// content collections) and the editing-state UI concern, since disposing a
// content on removal needs to clear it if it was being edited. ContentStore
// reads roomContents to compute its derived `all`/`sorted` view.
export class ContentSyncService {
  private contentIdCounter = 0
  // Injected once by Conference (the composition root) so this store never
  // imports @models/conference directly. See ContentSyncTransport.ts.
  private syncTransport?: ContentSyncTransport
  public setSyncTransport(transport: ContentSyncTransport) {
    this.syncTransport = transport
  }

  constructor() {
    makeObservable(this)
  }

  @observable editing = ''                        //  the user editing content
  private beforeChangeEditing?: (cur:string, next:string) => void = undefined
  @action setEditing(id: string){
    if (id !== this.editing && this.beforeChangeEditing){
      this.beforeChangeEditing(this.editing, id)
    }
    this.editing = id
  }
  public setBeforeChangeEditing(callback?: (cur:string, next:string)=>void, id?:string){
    if (!id || id === this.editing){
      this.beforeChangeEditing = callback
    }
  }

  //  The contents. Only visible contents are received.
  @observable.shallow roomContents = new Map<string, ISharedContent>()
  //  Info of the contents. All contents are listed.
  @observable.shallow roomContentsInfo = new Map<string, SharedContentInfo>()

  public find(cid: string) {
    return this.roomContents.get(cid)
  }

  public assignId(c:ISharedContent) {
    if (!c.id) {
      c.id = this.getUniqueId()
    }
  }

  //  add
  addLocalContent(c:ISharedContent) {
    this.assignId(c)
    this.updateByLocal(c)
  }

  //  Temporaly update local only no sync with other participant.
  //  This makes non-detectable inconsistency and must call updateByLocal() soon later.
  updateLocalOnly(newContent: ISharedContent){
    this.roomContents.set(newContent.id, newContent)
  }
  //  updated by local user
  updateByLocal(newContent: ISharedContent) {
    this.roomContents.set(newContent.id, newContent)
    this.syncTransport?.sendContentUpdateRequest('', [newContent])
    this.roomContentsInfo.set(newContent.id, newContent)
  }

  //  removed by local user
  removeByLocal(cid: string) {
    if (cid === 'mainScreen'){
      if (contentTrackStore.mainScreenOwner === this.syncTransport?.localPeer){
        this.syncTransport?.removeLocalTrackByRole(true, 'mainScreen')
      }
    }else{
      const toRemove = this.roomContents.get(cid)
      if (toRemove){
        this.disposeContent(toRemove)
        this.roomContents.delete(cid)
      }
      this.syncTransport?.sendContentRemoveRequest('', [cid])
      this.roomContentsInfo.delete(cid)
    }
  }
  //  request content by id which is not received yet.
  requestContent(cids: string[]){
    this.syncTransport?.requestContentUpdateById(cids)
  }
  //  Update request from remote.
  updateByRemoteRequest(cs: ISharedContent[]) {
    for (const c of cs) {
      this.roomContents.set(c.id, c)
      if ((c.type === 'screen' || c.type === 'camera')) {
        this.onUpdateScreenContent(c)
      }
    }
  }
  //  Remove request from remote.
  removeByRemoteRequest(cids: string[]) {
    for (const cid of cids) {
      const toRemove = this.roomContents.get(cid)
      if (toRemove){
        this.disposeContent(toRemove)
        this.roomContents.delete(cid)
      }else{
        if (this.editing === cid){
          this.editing = ''
        }
      }
      this.roomContentsInfo.delete(cid)
    }
  }

  removeAllContents(){
    const cids = Array.from(this.roomContentsInfo.keys())
    this.syncTransport?.sendContentRemoveRequest('', cids)
    this.roomContents.clear()
    this.roomContentsInfo.clear()
  }

  // create a new unique content id
  private getUniqueId(): string {
    const pid = participantsStore.localId
    while (1) {
      this.contentIdCounter += 1
      const id = `${pid}_${this.contentIdCounter}`
      if (!this.roomContents.has(id) && !participantsStore.remote.has(id)) { return id }
    }

    //  eslint-disable-next-line no-unreachable
    return ''
  }

  private disposeContent(c: ISharedContent) {
    if (c.id === this.editing){
      this.setEditing('')
    }
    if (c.type === 'screen' || c.type === 'camera') {
      const peerAndTracks = contentTrackStore.contentTracks.get(c.id)
      if (peerAndTracks?.peer) {
        if (peerAndTracks.peer === participants.localId){
          this.syncTransport?.removeLocalTrackByRole(true, c.id)
          contentTrackStore.contentTracks.delete(c.id)
        }else{
          //  Track will removed via rtcTransports
          //  conference.closeTrack(peerAndTracks.peer, c.id)
          //  this.contentTracks.delete(c.id)
        }
      }
    }
  }

  private onUpdateScreenContent(c: ISharedContent){
    //console.log(`onUpdateScreenContent(${JSON.stringify(c)})`)
    //const peerAndTracks = this.contentTracks.get(c.id)
    //console.log(`peerAndTracks = ${JSON.stringify(peerAndTracks)}`)
  }
}

const contentSyncService = new ContentSyncService()
export default contentSyncService

declare const d:any                  //  from index.html
d.contentSyncService = contentSyncService
