import {priorityCalculator} from '@models/middleware/trafficControl'
import { urlParameters } from '@models/url'
import {ConnectionInfo, ConnectionStates} from '@stores/ConnectionInfo'
import errorInfo from '@stores/ErrorInfo'
import participants from '@stores/participants/Participants'
import contents from '@stores/sharedContents/SharedContents'
import {EventEmitter} from 'events'
//import {stringify} from 'flatted'
import jquery from 'jquery'
import { _allowStateChanges } from 'mobx'
import {Store} from '../../stores/utils'
import {Conference} from './Conference'
import { connection } from './ConnectionDefs'
import {MessageType, Message, RoomMessage} from './MediaMessages'

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

/*
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
*/


 export class Connection extends EventEmitter {
  private _store: Store<ConnectionInfo> | undefined
  public conference = new Conference()
  public mainServer?:WebSocket

  public set store(store: Store<ConnectionInfo>|undefined) {
    this._store = store
  }
  public get store() {
    return this._store
  }

  public connect(){
    const promise = new Promise<void>((resolve, reject)=>{
      if (this.store?.state !== 'disconnected'){
        console.error(`Already in ${this.store?.state} state`)
        reject()
        return
      }
      this.store?.changeState('connecting')

      this.mainServer = new WebSocket(config.mainServer)

      const onOpen = () => {
        if (!participants.local.id){
          const msg:Message = {type:'connect', peer:participants.local.information.name.substring(0, 4)}
          this.mainServer?.send(JSON.stringify(msg))
        }
      }
      const onMessage = (ev: MessageEvent<any>)=> {
        //  console.log(`ws:`, ev)
        if (typeof ev.data === 'string') {
          const msg = JSON.parse(ev.data) as Message
          switch(msg.type){
            case 'connect':{
              participants.local.id = msg.peer
              this._store?.changeState('connected')
              //console.log('getUniqueId received')
              resolve()
            }break
          }
        }
      }
      const onClose = () => {
        //console.log('onClose() for mainServer')
        setTimeout(()=>{
          this.mainServer = new WebSocket(config.mainServer)
          setHandler()
        }, 5 * 1000)
      }
      const onError = () => {
        console.error(`Error in WebSocket for ${config.mainServer}`)
        this.mainServer?.close(3000, 'onError')
        onClose()
      }

      const setHandler = () => {
        this.mainServer?.addEventListener('error', onError)
        this.mainServer?.addEventListener('message', onMessage)
        this.mainServer?.addEventListener('open', onOpen)
        this.mainServer?.addEventListener('close', onClose)
      }
      setHandler()
    })
    return promise
  }

  public joinConference(conferenceName: string) {
    if (this.mainServer){
      const msg:RoomMessage = {
        type: 'join',
        peer: participants.local.id,
        room: conferenceName
      }
      console.log(`join sent ${JSON.stringify(msg)}`)
      this.mainServer.send(JSON.stringify(msg))
      this.conference.init(msg.room)
    }else{
      throw new Error('No connection has been established.')
    }
  }
  public leaveConference(){
    return this.conference.uninit()
  }

  public disconnect(): Promise < any > {
    /*
    if (this._jitsiConnection) {
      connLog('Disconnection order has been sent.')

      return this._jitsiConnection?.disconnect()
    }
    */

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
}
