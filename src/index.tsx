import {App} from '@components/App'
// Side-effect import: instantiates ConnectedManager singleton. Must use bare
// `import '...'` (not `import {} from '...'`) so Rollup preserves it in production builds.
import '@models/audio'
import {manager as audioManager} from '@models/audio'
import {i18nInit} from '@models/locales'
import {resolveAtEnd} from '@models/utils'
import errorInfo from '@stores/room/ErrorInfo'
// Side-effect import: instantiates all store singletons (participants, contents, map, …).
// Must use bare `import '...'` for the same reason as above.
import '@stores/index'
import contentTrackStore from '@stores/sharedContents/ContentTrackStore'
import {configure} from "mobx"
import ReactDOM from 'react-dom'
import {conference} from '@models/conference'
import {participants} from '@stores/index'
import {startOutputDeviceObservation} from '@models/conference/observeOutputDevice'
import {startBroadcastObservation} from '@stores/media/StereoParameters'

configure({
    enforceActions: "never",
})

// Wire the audio layer's need for "which remote tracks are being consumed"
// to conference here, in the composition root, rather than having
// models/audio import @models/conference directly (which would create a
// cycle, since models/audio is instantiated very early in bootstrap).
audioManager.setAudiosToConsumeAccessor(() => conference.priorityCalculator.tracksToConsume.audios)


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
      (contentTrackStore.getLocalRtcContentIds().length || contentTrackStore.mainScreenOwner === participants.localId)) {
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
    conference.leave().then((res)=>{
      logStr += `\nconference.leave() success with ${res}.`
      localStorage.setItem('log', logStr)
    }).catch((e)=>{
      logStr += `\nconference.leave() failed with ${e}.`
      localStorage.setItem('log', logStr)
    })
    logStr += `\nconference.leave() called.`
    localStorage.setItem('log', logStr)
  })

  startOutputDeviceObservation()
  startBroadcastObservation()
  errorInfo.connectionStart()

  if (import.meta.env.DEV) {
    ;(window as any).__testHelpers = {
      setSpeakerDevice: (deviceId: string) => {
        participants.local.devicePreference.audiooutput = deviceId
      },
      getSpeakerDeviceSinkId: () => audioManager.getAudioOutput(),
      getAudioOutputDevices: async () => {
        const devices = await navigator.mediaDevices.enumerateDevices()
        return devices
          .filter(d => d.kind === 'audiooutput')
          .map(d => ({ deviceId: d.deviceId, label: d.label }))
      },
      getOutputPreference: () => participants.local.devicePreference.audiooutput,
    }
  }
}
