import {App} from '@components/app'
import {connection} from '@models/api'
import '@models/audio'  // init manager (DO NOT delete)
import {resolveAtEnd} from '@models/utils'
import '@stores/index' // init store (DO NOT delete)
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
  // TODO add code
  connection.init().then(
    () => connection.joinConference('haselabtest'),
  )
}
