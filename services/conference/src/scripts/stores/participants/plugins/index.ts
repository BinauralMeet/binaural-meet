/**
 * Plugins for add contents to participant store
 * (Use 'SharedContentsLookup' as example for adding new plugin)
 */

// import {SharedContentsLookup} from './SharedContentsLookup'
import {StreamControl} from './StreamControl'
import {ParentStore} from './utils'

export class Plugins {
//  contents: SharedContentsLookup
  streamControl: StreamControl

  constructor(parent: ParentStore) {
//    this.contents = new SharedContentsLookup(parent)
    this.streamControl = new StreamControl(parent)
  }
}
