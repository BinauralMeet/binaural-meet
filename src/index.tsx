import {App} from '@components/App'
import '@models/audio'  // init audio manager (DO NOT delete)
import {i18nInit} from '@models/locales'
import {urlParameters} from '@models/url'
import {resolveAtEnd} from '@models/utils'
import errorInfo from '@stores/ErrorInfo'
import '@stores/index'  // init store (DO NOT delete)
import contents from '@stores/sharedContents/SharedContents'
import {when} from 'mobx'
import {configure} from "mobx"
import ReactDOM from 'react-dom'
import {conference} from '@models/conference'
import {participants} from '@stores/index'
import {} from '@models/conference/observeOutputDevice'

configure({
    enforceActions: "never",
})


i18nInit().then(main)

function main() {
  /*  //  Show last log for beforeunload
    const logStr = localStorage.getItem('log')
    console.log(`logStr: ${logStr}`)  //  */

  const startPromise = resolveAtEnd(onStart)()
  startPromise.then(resolveAtEnd(renderDOM))
  startPromise.then(resolveAtEnd(startConference))
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
function startConference() {
  window.addEventListener('beforeunload', (ev) => {
    logStr = `${logStr}beforeunload called. ${Date()} `
    localStorage.setItem('log', logStr)

    //  prevent leaving from and reloading browser, when the user shares screen(s).
    if (!errorInfo.type &&
      (contents.getLocalRtcContentIds().length || contents.mainScreenOwner === participants.localId)) {
      logStr += 'Ask user. '
      ev.preventDefault()
      ev.stopImmediatePropagation()
      ev.returnValue = ''
      localStorage.setItem('log', logStr)

      return ev.returnValue
    }
    errorInfo.onDestruct()
    logStr += `\nBefore call conference.leave().`
    localStorage.setItem('log', logStr)
    conference.leave()
    logStr += `\nconference.leave() called.`
    localStorage.setItem('log', logStr)
  })

  errorInfo.connectionStart()
  when(() => errorInfo.type === '', () => {
    const room = urlParameters.room || '_'
    // moved to TheEntrance
    // conference.enter(room, false)
  })
}
