import {priorityCalculator} from '@models/middleware/trafficControl'
import { urlParameters } from '@models/url'
import {ConnectionInfo} from '@stores/ConnectionInfo'
import errorInfo from '@stores/ErrorInfo'
import participants from '@stores/participants/Participants'
import contents from '@stores/sharedContents/SharedContents'
import {EventEmitter} from 'events'
//import {stringify} from 'flatted'
import jquery from 'jquery'
import JitsiMeetJS from 'lib-jitsi-meet'
import {Store} from '../../stores/utils'
import {Conference} from './Conference'
import {ConnectionStates, ConnectionStatesType} from './Constants'

//  import * as TPC from 'lib-jitsi-meet/modules/RTC/TPCUtils'
// import a global variant $ for lib-jitsi-meet


// config.js
declare const config:any                  //  from ../../config.js included from index.html

//  Log level and module log options
export const JITSILOGLEVEL = 'warn'  // log level for lib-jitsi-meet {debug|log|warn|error}
export const TRACKLOG = false        // show add, remove... of tracks
export const CONNECTIONLOG = false
//  if (TPC.setTPCLogger !== undefined) {
  //  TPC.setTPCLogger(TRACKLOG ? console.log : (a:any) => {})
//  }
export const trackLog = TRACKLOG ? console.log : (a:any) => {}
export const connLog = CONNECTIONLOG ? console.log : (a:any) => {}
export const connDebug = CONNECTIONLOG ? console.debug : (a:any) => {}

declare const global: any
global.$ = jquery
global.jQuery = jquery

export const initOptions: JitsiMeetJS.IJitsiMeetJSOptions = {
  useIPv6: false,
  disableSimulcast: true,
  enableWindowOnErrorHandler: true,
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

  desktopSharingFrameRate: {min: 0.3, max: 30}  //  override by config.js
}


 export class Connection extends EventEmitter {
  private _jitsiConnection?: JitsiMeetJS.JitsiConnection
  private _store: Store<ConnectionInfo> | undefined
  public conference = new Conference()
  public version = '0.0.1'
  public state = ConnectionStates.DISCONNECTED

  public set Store(store: Store<ConnectionInfo>) {
    this._store = store
  }

  public init(): Promise<string> {
    Object.assign(initOptions, config.rtc.screenOptions)

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
      this.conference.init(conferenceName, () => {
        return this._jitsiConnection?.initJitsiConference(conferenceName.toLowerCase(), config)
      })

      return
    }
    throw new Error('No connection has been established.')
  }
  public leaveConference(){
    return this.conference.uninit()
  }

  public disconnect(): Promise < any > {
    if (this._jitsiConnection) {
      connLog('Disconnection order has been sent.')

      return this._jitsiConnection?.disconnect()
    }

    return Promise.reject('No connection has been established.')
  }
  reconnect(){
    errorInfo.setType('retry')

    /*  // if not reload, this block is needed
    const localCamera = this.conference.getLocalCameraTrack()
    const micMute = participants.local.muteAudio
    const cameraMute = participants.local.muteVideo
    //  */

    participants.leaveAll()
    contents.clearAllRemotes()
    priorityCalculator.clear()

    //  Try to connect again.
    this.leaveConference().then(()=>{
      console.log('Disconnected but succeed in leaving... strange ... try to join again.')
    }).catch(()=>{
      console.log('Disconnected and failed to leave... try to join again')
      this.conference.bmRelaySocket?.close()
    }).finally(()=>{
      if (urlParameters.testBot !== null){
        window.location.reload()
      }
      ///*  // reload or

      //  Ask reload to user or auto reload ?
      //  window.location.reload()

      /*/ // init again
      this.init().then(()=>{
        this.joinConference(this.conference.name)
        function restoreLocalTracks(){
          if (!localCamera || localCamera.disposed){
            participants.local.muteAudio = micMute
            participants.local.muteVideo = cameraMute
          }else{
            setTimeout(restoreLocalTracks, 100)
          }
        }
        restoreLocalTracks()
        function restoreContentTracks(){
          if (participants.localId){
            contents.tracks.restoreLocalCarriers()
          }else{
            setTimeout(restoreContentTracks, 100)
          }
        }
        restoreContentTracks()

        errorInfo.clear()
      })
    //  */
    })
  }

  private onStateChanged(state: ConnectionStatesType) {
    //  console.log(`ConnctionStateChanged: ${this.state} => ${state}`)
    if (this.state !== state && state === ConnectionStates.DISCONNECTED){
      setTimeout(()=>{
        this._jitsiConnection!.disconnect().finally(()=>{
          setTimeout(this.reconnect.bind(this), 1000)
        })
      }, 1000)
    }
    this.state = state
    if (this._store) {
      this._store.changeState(this.state)
    }
  }
}
