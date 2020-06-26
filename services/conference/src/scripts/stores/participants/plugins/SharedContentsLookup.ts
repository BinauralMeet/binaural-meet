import {connection} from '@models/api'
import {action, decorate, observable} from 'mobx'
import {SharedContent} from '../../SharedContent'
import {default as sharedContents} from '../../SharedContents'
import {default as participants} from '../Participants'
import {ParticipantStorePlugin} from './utils'

export class SharedContentsLookup extends ParticipantStorePlugin {
  value = new Map<string, SharedContent>()

  ///  Add a new content to the local pariticipant
  addContent(newCont: SharedContent):string {
    console.log('addContent: ', newCont)
    if (!participants.isLocal(this.parent.id)) {
      console.log('Error: addContent is only for local participant')

      return ''
    }
    // fin key for new content
    //  find max count + 1
    let count = 0
    this.value.forEach((val, key) => {
      const c = parseInt(key.split('_')[1], 10)
      count = (c > count) ? c : count
    })
    const key = `${this.parent.id}_${count + 1}`
    this.value.set(key, newCont)
    if (!sharedContents.order.has(key)) {
      sharedContents.order.set(key, newCont)
      sharedContents.sendOrder()
      connection.sendSharedContents(this.value)
    }

    return key
  }
  ///  remove a content to the local pariticipant
  removeContent(key: string):boolean {
    const rv = this.value.delete(key)
    sharedContents.order.delete(key)
    sharedContents.sendOrder()
    connection.sendSharedContents(this.value)

    return rv
  }
  /// Set contents to a remote or local partitipant
  setContents(newConts: Map<string, SharedContent>):void {
    console.log('setContents: ', newConts)
    const toDel = this.value.diff(newConts)
    const toAdd = newConts.diff(this.value)
    this.value = newConts
    const order = new Map<string, SharedContent>(sharedContents.order)
    sharedContents.order = order.diff(toDel)  //  diff is defined only for pure Map
    const toSet = toAdd.diff(sharedContents.order)
    const toAssign = toAdd.diff(toSet)
    toAssign.forEach((val, key) => Object.assign(sharedContents.order.get(key), val))
    toSet.forEach((val, key) => sharedContents.order.set(key, val))
    if (participants.isLocal(this.parent.id)) { //  if this is local participant
      if ((toSet.size > 0 || toDel.size > 0)) { sharedContents.sendOrder() }  // send order first
      if (toAdd.size > 0 || toDel.size > 0) { connection.sendSharedContents(this.value) }  //  send contents
    }
  }
}

decorate(
  SharedContentsLookup,
  {
    value: observable,
    addContent: action,
    removeContent: action,
    setContents: action,
  },
)
