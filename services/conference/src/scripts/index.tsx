import {App} from '@components/app'
import {connection} from '@models/api'
import '@models/audio'  // init audio manager (DO NOT delete)
import '@models/middleware'
import {urlParameters} from '@models/url'
import {resolveAtEnd} from '@models/utils'
import errorInfo from '@stores/ErrorInfo'
import '@stores/index'  // init store (DO NOT delete)
import participants from '@stores/participants/Participants'
import contents from '@stores/sharedContents/SharedContents'
import {autorun} from 'mobx'
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
    //  save my pid as ghost candidate.
    const idx = participants.ghostCandidates.pids.findIndex(pid => pid[0] === participants.localId)
    if (idx >= 0) {
      participants.ghostCandidates.pids[idx] = [participants.localId, Date.now()]
    }else {
      participants.ghostCandidates.pids.push([participants.localId, Date.now()])
    }
    participants.saveGhostsToStorage()

    //  prevent leaving from and reloading browser, when the user shares screen(s).
    if (!errorInfo.type &&
      (contents.tracks.localMains.size || contents.tracks.localContents.size)) {
      ev.preventDefault()
      ev.stopImmediatePropagation()
      ev.returnValue = ''

      return ev.returnValue
    }
  })

  errorInfo.connectionStart()
  connection.init().then(
    () => {
      const disposer = autorun(() => {
        if (!errorInfo.type) {
          const conferenceName = urlParameters.room || 'haselabtest'
          connection.joinConference(conferenceName)
          disposer()
        }
      })
    },
  )
}
