import {App} from '@components/App'
import {connection} from '@models/api'
import '@models/audio'  // init audio manager (DO NOT delete)
import {i18nInit} from '@models/locales'
import '@models/middleware'
import {urlParameters} from '@models/url'
import {resolveAtEnd} from '@models/utils'
import errorInfo from '@stores/ErrorInfo'
import '@stores/index'  // init store (DO NOT delete)
import contents from '@stores/sharedContents/SharedContents'
import {when} from 'mobx'
import {configure} from "mobx"
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
    connection.leaveConference()
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
