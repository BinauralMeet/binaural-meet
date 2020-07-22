import {App} from '@components/app'
import {connection} from '@models/api'
import '@models/audio'  // init audio manager (DO NOT delete)
import '@models/middleware'
import {urlParameters} from '@models/url'
import {resolveAtEnd} from '@models/utils'
import '@stores/index' // init store (DO NOT delete)
import 'mobx-react-lite/batchingForReactDom'
import React from 'react'
import ReactDOM from 'react-dom'


main()

function main() {
  const startPromise = resolveAtEnd(onStart)()
  startPromise.then(resolveAtEnd(renderDOM))
  startPromise.then(resolveAtEnd(connectConference))
}

function onStart() {
  console.log('start')
}

function renderDOM() {
  const root = document.querySelector('#root')
  ReactDOM.render(<App />, root)
}

function connectConference() {
  const conferenceName = urlParameters.name || 'haselabtest'

  connection.init().then(
    () => connection.joinConference(conferenceName),
  )
}

import config from '@models/api/automerge/config'
import * as AutoMerge from 'automerge'
import AutoMergeClient from 'automerge-client'

const initData = {
  sharedContents: AutoMerge.save(AutoMerge.init()),
}

const socket = new WebSocket(config.url)
const client = new AutoMergeClient({
  socket,
  savedData: JSON.stringify(initData),
})
