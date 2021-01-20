// import a global variant $ for lib-jitsi-meet
import errorInfo from '@stores/ErrorInfo'
import {ConnectionInfo, default as ConnectionInfoStore} from '@stores/ConnectionInfo'
import {EventEmitter} from 'events'
import jquery from 'jquery'
import JitsiMeetJS from 'lib-jitsi-meet'
import * as TPC from 'lib-jitsi-meet/modules/RTC/TPCUtils'
import {Store} from '../../stores/utils'
import {Conference} from './Conference'
import {ConnectionStates, ConnectionStatesType} from './Constants'

// config.js
declare const config:any                  //  from ../../config.js included from index.html

//  Log level and module log options
export const JITSILOGLEVEL = 'warn'  // log level for lib-jitsi-meet {debug|log|warn|error}
export const TRACKLOG = false        // show add, remove... of tracks
export const CONNECTIONLOG = false
if (TPC.setTPCLogger !== undefined) {
  //  TPC.setTPCLogger(TRACKLOG ? console.log : (a:any) => {})
}
export const trackLog = TRACKLOG ? console.log : (a:any) => {}
export const connLog = CONNECTIONLOG ? console.log : (a:any) => {}
export const connDebug = CONNECTIONLOG ? console.debug : (a:any) => {}

declare var global: any
global.$ = jquery
global.jQuery = jquery

const initOptions: JitsiMeetJS.IJitsiMeetJSOptions = {
  useIPv6: false,
  disableSimulcast: false,
  enableWindowOnErrorHandler: false,
  enableAnalyticsLogging: false,
  disableThiredPartyRequests: false,
  disableAudioLevels: false,

  // The ID of the jidesha extension for Chrome.
  desktopSharingChromeExtId: 'mbocklcggfhnbahlnepmldehdhpjfcjp',

  // Whether desktop sharing should be disabled on Chrome.
  desktopSharingChromeDisabled: false,

  // The media sources to use when using screen sharing with the Chrome
  // extension.
  desktopSharingChromeSources: ['screen', 'window'],

  // Required version of Chrome extension
  desktopSharingChromeMinExtVersion: '0.1',

  // Whether desktop sharing should be disabled on Firefox.
  desktopSharingFirefoxDisabled: false,
}


export class Connection extends EventEmitter {
  private _jitsiConnection?: JitsiMeetJS.JitsiConnection
  private _store: Store<ConnectionInfo> | undefined
  public conference = new Conference()
  public version = '0.0.1'
  public conferenceName = ''
  public state = ConnectionStates.DISCONNECTED

  constructor() {
    super()
  }

  public set Store(store: Store<ConnectionInfo>) {
    this._store = store
  }

  public init(): Promise<string> {
    errorInfo.connectionStart()
    return new Promise<string>((resolve, reject) => {
      JitsiMeetJS.init(initOptions)
      JitsiMeetJS.setLogLevel(JITSILOGLEVEL)

      this._jitsiConnection = new JitsiMeetJS.JitsiConnection(null, undefined, config)
      this._jitsiConnection.addEventListener(JitsiMeetJS.events.connection.CONNECTION_ESTABLISHED, () => {
        this.onStateChanged(ConnectionStates.CONNECTED)
        resolve(JitsiMeetJS.events.connection.CONNECTION_ESTABLISHED)
      })
      this._jitsiConnection.addEventListener(JitsiMeetJS.events.connection.CONNECTION_FAILED, () => {
        this.onStateChanged(ConnectionStates.DISCONNECTED)
        reject(JitsiMeetJS.events.connection.CONNECTION_FAILED)
      })
      this._jitsiConnection.addEventListener(JitsiMeetJS.events.connection.CONNECTION_DISCONNECTED, () => {
        this.onStateChanged(ConnectionStates.DISCONNECTED)
      })
      this._jitsiConnection.connect()
      this.onStateChanged(ConnectionStates.CONNECTING)
    })
  }

  public joinConference(conferenceName: string) {
    if (this._jitsiConnection) {
      this.conferenceName = conferenceName
      const jitsiConference = this._jitsiConnection.initJitsiConference(conferenceName, config)
      this.conference.init(jitsiConference)

      return
    }
    throw new Error('No connection has been established.')
  }

  public disconnect(): Promise < any > {
    if (this ._jitsiConnection) {
      connLog('Disconnection order has been sent.')

      return this._jitsiConnection?.disconnect()
    }

    return Promise.reject('No connection has been established.')
  }

  private onStateChanged(state: ConnectionStatesType) {
    this.state = state
    connDebug(`ConnctionStateChanged: Current Connection State: ${state}`)
    if (this._store) {
      this._store.changeState(this.state)
    }
  }
}
export const connection = new Connection()
connection.Store = ConnectionInfoStore
