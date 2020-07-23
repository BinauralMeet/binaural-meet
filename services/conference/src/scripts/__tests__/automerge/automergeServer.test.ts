import {Done} from '@material-ui/icons'
import config from '@models/api/automerge/config'
import * as AutoMerge from 'automerge'
import AutoMergeClient from 'automerge-client'

it('connected automerge server through websocket', (done) => {
  const success = () => {
    done()
  }
  const fail = (reason: any) => {
    done(reason)
  }

  const socket = new WebSocket(config.url)
  socket.addEventListener('open', success)
  socket.addEventListener('error', fail)
})

it('create automerge document', (done) => {
  const initData = {
    sharedContents: AutoMerge.save(AutoMerge.init()),
  }

  const socket = new WebSocket(config.url)
  const client = new AutoMergeClient({
    socket,
    savedData: JSON.stringify(initData),
  })

  client.addEventListener('subscribed', () => {
    done()
  })
})
