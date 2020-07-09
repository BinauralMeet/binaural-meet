import {App} from '@components/app'
import {connection} from '@models/api'
import '@models/audio'  // init audio manager (DO NOT delete)
import '@models/ContentMiddleware'
import '@models/TrackMiddleware'
import {resolveAtEnd} from '@models/utils'
import {getParameters} from '@models/utils/url'
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
  const conferenceName = getParameters.name || 'haselabtest'

  connection.init().then(
    () => connection.joinConference(conferenceName),
  )
}
