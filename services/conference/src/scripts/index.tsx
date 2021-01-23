import {App} from '@components/app'
import {connection} from '@models/api'
import '@models/audio'  // init audio manager (DO NOT delete)
import '@models/middleware'
import {urlParameters} from '@models/url'
import {resolveAtEnd} from '@models/utils'
import errorInfo from '@stores/ErrorInfo'
import '@stores/index'  // init store (DO NOT delete)
import contents from '@stores/sharedContents/SharedContents'
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
  //  console.debug('start')
}

function renderDOM() {
  const root = document.querySelector('#root')
  ReactDOM.render(<App />, root)
}

function connectConference() {
  window.addEventListener('beforeunload', (ev) => {
    //  prevent leaving or reloading browser when the user shares screen(s).
    if (!errorInfo.type &&
      (contents.tracks.localMains.size || contents.tracks.localContents.size)) {
      ev.preventDefault()
      ev.stopImmediatePropagation()
      ev.returnValue = 'Really leave from Binaural Meet ?'
    }
  },                      true)

  const conferenceName = urlParameters.room || 'haselabtest'
  errorInfo.connectionStart()
  connection.init().then(
    () => {
      connection.joinConference(conferenceName)
    },
  )
}
