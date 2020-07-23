import {Done} from '@material-ui/icons'
import config from '@models/api/automerge/config'
import * as AutoMerge from 'automerge'
import AutoMergeClient from 'automerge-client'
import {random} from 'faker'

const DOC_SYNC_MAX_TIME_MS = 3000
const DOC_CLEAR_MAX_TIME_MS = 10000

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

it('connect and create automerge document', (done) => {
  const client = createClient(random.uuid())

  client.addEventListener('subscribed', () => {
    done()
  })

  client.addEventListener('error', (event) => {
    done(event.detail.message)
  })
})

it(`documents are synchronized in ${DOC_SYNC_MAX_TIME_MS} ms`, () => {
  const docId = random.uuid()
  const client1 = createClient(docId)
  const client2 = createClient(docId)

  const newKey = 'test'
  const newValue = 'test'
  const changer = (doc: any) => {
    doc[newKey] = newValue
  }

  client1.change(docId, changer)

  return new Promise(
    (resolve) => {
      setTimeout(
        () => {
          resolve()
        },
        DOC_SYNC_MAX_TIME_MS,
    )
    }).then(() => {
      expect(client2.docs[docId][newKey]).toEqual(newValue)
    })
})

it(`documents are deleted when no references after ${DOC_CLEAR_MAX_TIME_MS} ms`, () => {
  const docId = random.uuid()
  const client1 = createClient(docId)

  const newKey = 'test'
  const newValue = 'test'
  const changer = (doc: any) => {
    doc[newKey] = newValue
  }

  client1.change(docId, changer)

  client1.socket.close()

  const wait10s = new Promise(resolve => setTimeout(resolve, DOC_CLEAR_MAX_TIME_MS))

  return wait10s.then(
    () => {
      const client2 = createClient(docId)

      return new Promise(resolve => setTimeout(resolve, DOC_SYNC_MAX_TIME_MS)).then(
        () => {
          expect(client2.docs[docId][newKey]).toEqual(undefined)
        },
      )
    },
  )
}, 15000)

function createClient(docId: string) {
  const initData = {
    [docId]: AutoMerge.save(AutoMerge.init()),
  }

  const socket = new WebSocket(config.url)
  const client = new AutoMergeClient({
    socket,
    savedData: JSON.stringify(initData),
  })

  return client
}
