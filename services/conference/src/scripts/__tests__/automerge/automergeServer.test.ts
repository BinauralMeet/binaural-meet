import config from '@models/api/automerge/config'
import * as AutoMerge from 'automerge'
import AutoMergeClient from 'automerge-client'

it('connected automerge server through websocket', () => {
  const socket = new WebSocket(config.url)
})

describe('create automerge document', () => {
  const initData = {
    sharedContents: AutoMerge.save(AutoMerge.init()),
  }

  const socket = new WebSocket(config.url)
  const client = new AutoMergeClient({
    socket,
    savedData: JSON.stringify(initData),
  })
})
