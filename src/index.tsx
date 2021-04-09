import {App} from '@components/App'
import {connection} from '@models/api'
import '@models/audio'  // init audio manager (DO NOT delete)
import {i18nInit} from '@models/locales'
import '@models/middleware'
import {urlParameters} from '@models/url'
import {resolveAtEnd} from '@models/utils'
import errorInfo from '@stores/ErrorInfo'
import '@stores/index'  // init store (DO NOT delete)
import participants from '@stores/participants/Participants'
import contents from '@stores/sharedContents/SharedContents'
import {JitsiLocalTrack} from 'lib-jitsi-meet'
import {when} from 'mobx'
import { configure } from "mobx"
import ReactDOM from 'react-dom'

configure({
    enforceActions: "never",
})


i18nInit().then(main)

function main() {
  const startPromise = resolveAtEnd(onStart)()
  startPromise.then(resolveAtEnd(renderDOM))
  startPromise.then(resolveAtEnd(connectConference))
}

function onStart() {
  //  console.debug('start')
}

function renderDOM() {
  ReactDOM.render(
      <App />,
    document.getElementById('root')
  )
}

let logStr = ''
function connectConference() {
  window.addEventListener('beforeunload', (ev) => {
    logStr = `${logStr}beforeunload called. ${Date()} `
    localStorage.setItem('log', logStr)
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
      logStr += 'Ask user. '
      ev.preventDefault()
      ev.stopImmediatePropagation()
      ev.returnValue = ''
      localStorage.setItem('log', logStr)

      return ev.returnValue
    }

    if (participants.local.tracks.audio) {
      connection.conference.removeTrack(participants.local.tracks.audio as JitsiLocalTrack)
    }
    if (participants.local.tracks.avatar) {
      connection.conference.removeTrack(participants.local.tracks.avatar as JitsiLocalTrack)
    }
    connection.conference._jitsiConference?.leave().then((arg) => {
      logStr += `leave (${arg}). `
      localStorage.setItem('log', logStr)
    })
    connection.disconnect().then((arg) => {
      logStr += `Diconnected (${arg}). `
      localStorage.setItem('log', logStr)
    }).catch((reason) => {
      logStr += `Failed to diconnected (${reason}). `
      localStorage.setItem('log', logStr)
    })
  })

  errorInfo.connectionStart()
  connection.init().then(
    () => {
      when(() => errorInfo.type === '', () => {
        const conferenceName = urlParameters.room || '_'
        connection.joinConference(conferenceName)
      })
    },
  )
}
