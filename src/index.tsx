import {App} from '@components/App'
import {Connection, connections} from '@models/api'
import roomInfoServer from '@models/api/roomInfoServer'
import {i18nInit} from '@models/locales'
import loadController from '@models/trafficControl/loadController'
import {urlParameters} from '@models/url'
import {resolveAtEnd} from '@models/utils'
import '@stores/index'  // init store (DO NOT delete)
import { RemoteParticipant } from '@stores/participants/RemoteParticipant'
import {Room} from '@stores/Room'
import rooms from '@stores/Rooms'
import {configure} from 'mobx'
import ReactDOM from 'react-dom'

configure({
    enforceActions: "never",
})
declare const d:any                  //  from index.html

i18nInit().then(main)

function main() {
  //  for debug
  //urlParameters.role = 'sender'

  const startPromise = resolveAtEnd(onStart)()
  startPromise.then(resolveAtEnd(renderDOM))
  if (urlParameters.role === 'sender'){
    if (roomInfoServer.ws?.readyState === WebSocket.OPEN){
      startPromise.then(resolveAtEnd(connectConference))
    }else{
      roomInfoServer.onopen = ()=>{
        startPromise.then(resolveAtEnd(connectConference))
      }
    }
  }
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

    connections.forEach(connection => {
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
  })
  roomInfoServer.roomNames.forEach(roomName => {
    const connection = new Connection()
    connection.init().then(() => {
      const conferenceName = roomName || '_'
      const room = new Room(conferenceName, connection)
      rooms.rooms.set(room.name, room)
      connection.joinConference(room)
    })
    connections.push(connection)
  })
  d.connections = connections
  d.rooms = () => Array.from(rooms.rooms.values())
  d.remotes = () => {
    const rs = Array.from(rooms.rooms.values())
    const rv:RemoteParticipant[][] = []
    rs.forEach(room => {
      rv.push(Array.from(room.participants.remote.values()))
    })

    return rv
  }
  console.log(loadController.lastIdleCall)
}
