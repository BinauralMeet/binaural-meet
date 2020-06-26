/**
 * Plugins for add contents to participant store
 * (Use 'SharedContentsLookup' as example for adding new plugin)
 */

import {SharedContentsLookup} from './SharedContentsLookup'
import {ParentStore} from './utils'

export class Plugins {
  contents: SharedContentsLookup

  constructor(parent: ParentStore) {
    this.contents = new SharedContentsLookup(parent)
  }
}
