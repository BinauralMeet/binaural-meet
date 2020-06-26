import {connection} from '@models/api'
import {Control, Information, Participant as IParticipant, Perceptibility, Pose2DMap, Stream} from '@models/Participant'
import {action} from 'mobx'
import {SharedContent} from '../SharedContent'
import {default as sharedContents} from '../SharedContents'
import {shallowObservable, Store} from '../utils'
import {default as participants} from './Participants'

export class Participant implements Store<IParticipant> {
  readonly id: string
  pose = shallowObservable<Pose2DMap>({
    position: [0, 0],
    orientation: 0,
  })
  information = shallowObservable<Information>({
    name: 'Name',
    email: undefined,
    md5Email: undefined,
    avatarSrc: undefined,
  })
  perceptibility = shallowObservable<Perceptibility>({
    visibility: true,
    audibility: true,
  })
  stream = shallowObservable<Stream>({
    audioStream: undefined,
    avatarStream: undefined,
    screenStream: undefined,
  })
  control = shallowObservable<Control>({
    muteVideo: false,
    muteAudio: false,
    attenuation: 1,
  })
  contents = new Map<string, SharedContent>()
  ///  Add a new content to the local pariticipant
  @action addContent(newCont: SharedContent):string {
    console.log('addContent: ', newCont)
    if (!participants.isLocal(this.id)) {
      console.log('Error: addContent is only for local participant')

      return ''
    }
    // fin key for new content
    //  find max count + 1
    let count = 0
    this.contents.forEach((val, key) => {
      const c = parseInt(key.split('_')[1], 10)
      count = (c > count) ? c : count
    })
    const key = `${this.id}_${count + 1}`
    this.contents.set(key, newCont)
    if (!sharedContents.order.has(key)) {
      sharedContents.order.set(key, newCont)
      sharedContents.sendOrder()
      connection.sendSharedContents(this.contents)
    }

    return key
  }
  ///  remove a content to the local pariticipant
  @action removeContent(key: string):boolean {
    const rv = this.contents.delete(key)
    sharedContents.order.delete(key)
    sharedContents.sendOrder()
    connection.sendSharedContents(this.contents)

    return rv
  }
  /// Set contents to a remote or local partitipant
  @action setContents(newConts: Map<string, SharedContent>):void {
    console.log('setContents: ', newConts)
    const toDel = this.contents.diff(newConts)
    const toAdd = newConts.diff(this.contents)
    this.contents = newConts
    const order = new Map<string, SharedContent>(sharedContents.order)
    sharedContents.order = order.diff(toDel)  //  diff is defined only for pure Map
    const toSet = toAdd.diff(sharedContents.order)
    const toAssign = toAdd.diff(toSet)
    toAssign.forEach((val, key) => Object.assign(sharedContents.order.get(key), val))
    toSet.forEach((val, key) => sharedContents.order.set(key, val))
    if (participants.isLocal(this.id)) { //  if this is local participant
      if ((toSet.size > 0 || toDel.size > 0)) { sharedContents.sendOrder() }  // send order first
      if (toAdd.size > 0 || toDel.size > 0) { connection.sendSharedContents(this.contents) }  //  send contents
    }
  }
  constructor(id: string) {
    this.id = id
  }
}
