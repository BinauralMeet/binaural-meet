import client from '@models/automerge/clients/client'
import {RawDocumentsType} from '@models/automerge/clients/RawDocumentsType'
import {AutomergedStore} from '@models/automerge/utils/AutomergedStore'

const DOC_KEY = 'sharedContents'

export class SharedContents extends AutomergedStore<typeof DOC_KEY, RawDocumentsType> {
  defaultValue() {
    return {
      contents: {},
      renderOrder: [],
    }
  }
}

const sharedContents = new SharedContents(DOC_KEY, client)
export default sharedContents
