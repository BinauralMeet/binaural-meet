// import a global variant $ for lib-jitsi-meet
import {ConnectionInfo, default as ConnectionInfoStore} from '@stores/ConnectionInfo'
import {EventEmitter} from 'events'
import jquery from 'jquery'
import JitsiMeetJS from 'lib-jitsi-meet'
import JitsiLocalTrack from 'lib-jitsi-meet/modules/RTC/JitsiLocalTrack'
import * as TPC from 'lib-jitsi-meet/modules/RTC/TPCUtils'
import {Store} from '../../stores/utils'
import {Conference} from './Conference'
import {ConnectionStates, ConnectionStatesType} from './Constants'

// config.js
declare const config:any                  //  from ../../config.js included from index.html

//  Log level and module log options
export const JITSILOGLEVEL = 'warn'  // log level for lib-jitsi-meet {debug|log|warn|error}
export const TRACKLOG = true        // show add, remove... of tracks
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

console.log(`JitsiMeetJS Version: ${JitsiMeetJS.version}`)

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
  desktopSharingFirefoxDisabled: true,
}

const ConnectionEvents = {
  CONNECTION_ESTABLISHED: 'connection_established',
  CONNECTION_DISCONNECTED: 'connection_disconnected',
  CONNECTION_CONNECTING: 'connection_connecting',
}

class Connection extends EventEmitter {
  private _jitsiConnection?: JitsiMeetJS.JitsiConnection
  private _store: Store<ConnectionInfo> | undefined
  private _isForTest: boolean
  public conference = new Conference()
  public state = ConnectionStates.DISCONNECTED
  public version = '0.0.1'

  constructor(isForTest = false) {
    super()
    this._isForTest = isForTest
  }

  public set Store(store: Store<ConnectionInfo>) {
    this._store = store
  }

  public init(): Promise<string> {
    this.registerEventHandlers()

    return this.initJitsiConnection()
  }

  public joinConference(conferenceName: string) {
    if (this._jitsiConnection) {
      const jitsiConference = this._jitsiConnection.initJitsiConference(conferenceName, config)
      this.conference.init(jitsiConference, this._isForTest)

      return
    }
    throw new Error('No connection has been established.')
  }

  private registerEventHandlers() {

    // Connection events
    this.on(
      ConnectionEvents.CONNECTION_ESTABLISHED,
      this.onConnectionStateChanged.bind(this),
    )
    this.on(
      ConnectionEvents.CONNECTION_CONNECTING,
      this.onConnectionStateChanged.bind(this),
    )
    this.on(
      ConnectionEvents.CONNECTION_DISCONNECTED,
      this.onConnectionStateChanged.bind(this),
    )

  }


  private initJitsiConnection(): Promise < string > {
    return new Promise<string>(
      (resolve, reject) => {
        JitsiMeetJS.init(initOptions)
        JitsiMeetJS.setLogLevel(JITSILOGLEVEL)

        this._jitsiConnection = new JitsiMeetJS.JitsiConnection(
          null as unknown as string, undefined as unknown as string, config)

        /*    I don't have to add Origin header. Browser will add it.
            //  add Origin header
            let opt = this._jitsiConnection.xmpp.connection.options;
            opt['customHeaders'] = {Origin: 'https://localhost:9000'} */

        this._jitsiConnection.addEventListener(
          JitsiMeetJS.events.connection.CONNECTION_ESTABLISHED,
          () => {
            connDebug('Connection has been established.')
            this.emit(
              ConnectionEvents.CONNECTION_ESTABLISHED,
              ConnectionStates.CONNECTED,
            )
            resolve(ConnectionStates.CONNECTED)
          },
        )
        this._jitsiConnection.addEventListener(
          JitsiMeetJS.events.connection.CONNECTION_FAILED,
          () => {
            connDebug('Failed to connect.')
            reject(ConnectionStates.DISCONNECTED)
          },
        )
        this._jitsiConnection.addEventListener(
          JitsiMeetJS.events.connection.CONNECTION_DISCONNECTED,
          () => {
            connDebug('Disconnected from remote server.')
            this.emit(
              ConnectionEvents.CONNECTION_DISCONNECTED,
              ConnectionStates.DISCONNECTED,
            )
          },
        )
        this._jitsiConnection.connect()
        this.emit(
          ConnectionEvents.CONNECTION_CONNECTING,
          ConnectionStates.CONNECTING,
        )
      },
    )
  }

  public disconnect(): Promise < any > {
    if (this ._jitsiConnection) {
      connLog('Disconnection order has been sent.')

      return this._jitsiConnection?.disconnect()
    }

    return Promise.reject('No connection has been established.')
  }


  private onConnectionStateChanged(state: ConnectionStatesType) {
    this.state = state
    connDebug(`ConnctionStateChanged: Current Connection State: ${state}`)
    if (this._store) {
      this._store.changeState(this.state)
    }
  }

  public createJitisLocalTracksFromStream(stream: MediaStream): Promise < JitsiLocalTrack[] > {
    const videoTrack: MediaStreamTrack = stream.getVideoTracks()[0]
    const audioTrack: MediaStreamTrack = stream.getAudioTracks()[0]
    const videoStream: MediaStream = new MediaStream([videoTrack])
    let audioStream: MediaStream
    let audioTrackInfo: JitsiMeetJS.TrackInfo | undefined = undefined

    if (audioTrack) {
      audioStream = new MediaStream([audioTrack])
      audioTrackInfo = {
        videoType: null,
        mediaType: 'audio',
        rtcId: 0,
        stream: audioStream,
        track: audioTrack,
        effects: undefined,
        resolution: audioTrack.getSettings().height,
        deviceId: 'videofile_chrome',
        facingMode: 'environment',
      }
    }

    const videoTrackInfo: JitsiMeetJS.TrackInfo = {
      videoType: 'camera',
      mediaType: 'video',
      rtcId: 1,
      stream: videoStream,
      track: videoTrack,
      effects: undefined,
      resolution: videoTrack.getSettings().height,
      deviceId: 'videofile_chrome',
      facingMode: 'environment',
    }


    return audioTrackInfo ?
    Promise.resolve([
      new JitsiLocalTrack(videoTrackInfo),
      new JitsiLocalTrack(audioTrackInfo),
    ]) :
    Promise.resolve([new JitsiLocalTrack(videoTrackInfo)])
  }
}

const connection = new Connection()
connection.Store = ConnectionInfoStore

export {Connection, connection}
