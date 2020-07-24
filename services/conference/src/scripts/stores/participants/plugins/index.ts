/**
 * Plugins for add contents to participant store
 * (Use 'SharedContentsLookup' as example for adding new plugin)
 */

// import {SharedContentsLookup} from './SharedContentsLookup'
import {StreamControl} from './StreamControl'
import {ParentStoreBase} from './utils'

export class Plugins {
//  contents: SharedContentsLookup
  streamControl: StreamControl

  constructor(parent: ParentStoreBase) {
//    this.contents = new SharedContentsLookup(parent)
    this.streamControl = new StreamControl(parent)
  }
}
