import {priorityCalculator} from '@models/middleware/trafficControl'
import { urlParameters } from '@models/url'
import {ConnectionInfo} from '@stores/ConnectionInfo'
import errorInfo from '@stores/ErrorInfo'
import participants from '@stores/participants/Participants'
import contents from '@stores/sharedContents/SharedContents'
import {EventEmitter} from 'events'
import { _allowStateChanges } from 'mobx'
import {Store} from '../../stores/utils'
import {Conference} from './Conference'
import {MSCreateTransportMessage, MSMessage, MSPeerMessage, MSMessageType, MSRoomMessage, MSRTPCapabilitiesReply,
  MSTransportDirection, MSCreateTransportReply, MSConnectTransportMessage, MSConnectTransportReply,
  MSProduceTransportMessage, MSProduceTransportReply, MSTrackRole, MSConsumeTransportMessage, MSConsumeTransportReply, MSRemoteUpdateMessage, MSRemoteLeftMessage, MSResumeConsumerMessage, MSResumeConsumerReply, MSCloseProducerMessage, MSCloseProducerReply} from './MediaMessages'
import * as mediasoup from 'mediasoup-client';
import { ConsumerOptions } from 'mediasoup-client/lib/Consumer'

//  import * as TPC from 'lib-jitsi-meet/modules/RTC/TPCUtils'
// import a global variant $ for lib-jitsi-meet


// config.js
declare const config:any                  //  from ../../config.js included from index.html

//  Log level and module log options
export const TRACKLOG = false        // show add, remove... of tracks
export const CONNECTIONLOG = false

export const trackLog = TRACKLOG ? console.log : (a:any) => {}
export const connLog = CONNECTIONLOG ? console.log : (a:any) => {}
export const connDebug = CONNECTIONLOG ? console.debug : (a:any) => {}

declare const global: any

export class Connection extends EventEmitter {
  private _store: Store<ConnectionInfo> | undefined
  public conference = new Conference(this)
  public mainServer?:WebSocket
  public device?:mediasoup.Device
  public set store(store: Store<ConnectionInfo>|undefined) {
    this._store = store
  }
  public get store() {
    return this._store
  }
  private handlers = new Map<MSMessageType, (msg: MSMessage)=>void>()
  private promises = new Map<number, {resolve:(a:any)=>void, reject?:(a:any)=>void} >()
  private messageNumber = 1
  private setMessageSerialNumber(msg: MSMessage){
    this.messageNumber++;
    msg.sn = this.messageNumber
  }
  private setMessagePromise(msg:MSMessage, resolve:(a:any)=>void, reject?:(reson:any)=>void){
    this.setMessageSerialNumber(msg)
    this.promises.set(msg.sn!, {resolve, reject})
  }
  private sendWithPromise(msg:MSMessage, resolve:(a:any)=>void, reject?:(reson:any)=>void){
    if (!this.mainServer) {
      if (reject){
        reject('no mainServer')
      }
    }else{
      this.setMessagePromise(msg, resolve, reject)
      this.mainServer.send(JSON.stringify(msg))
    }
  }
  private callMessageResolve(m: MSMessage, a?:any){
    const sn = m.sn
    if (sn){
      this.promises.get(sn)?.resolve(a)
      this.promises.delete(sn)
    }
  }
  private callMessageReject(m: MSMessage, a?:any){
    const sn = m.sn
    if (sn){
      const reject = this.promises.get(sn)?.reject
      if (reject) reject(a)
      this.promises.delete(sn)
    }
  }

  public constructor(){
    super()
    this.setMessageHandlers()
    try{
      this.device = new mediasoup.Device();
    }catch (error:any){
      if (error.name === 'UnsupportedError')
        console.warn('browser not supported');
    }
  }
  private setMessageHandlers(){
    this.handlers.set('connect', this.onConnect)
    this.handlers.set('createTransport', this.onCreateTransport)
    this.handlers.set('rtpCapabilities', this.onRtpCapabilities)
    this.handlers.set('connectTransport', this.onConnectTransport)
    this.handlers.set('produceTransport', this.onProduceTransport)
    this.handlers.set('closeProducer', this.onCloseProducer)
    this.handlers.set('consumeTransport', this.onConsumeTransport)
    this.handlers.set('resumeConsumer', this.onResumeConsumer)
    this.handlers.set('remoteUpdate', this.onRemoteUpdate)
    this.handlers.set('remoteLeft', this.onRemoteLeft)
  }

  public loadDevice(peer: string){
    const promise = new Promise<void>((resolve, reject)=>{
      const msg:MSPeerMessage = {
        type:'rtpCapabilities',
        peer
      }
      this.sendWithPromise(msg, resolve, reject)
    })
    return promise
  }
  public onRtpCapabilities(base: MSMessage){
    const msg = base as MSRTPCapabilitiesReply
    this.device?.load({routerRtpCapabilities: msg.rtpCapabilities}).then(()=>{
      this.callMessageResolve(base)
    })
  }

  public connect(room: string){
    this.conference.name = room
    const promise = new Promise<void>((resolve, reject)=>{
      if (this.store?.state !== 'disconnected'){
        console.error(`Already in ${this.store?.state} state`)
        reject()
        return
      }
      this.store?.changeState('connecting')

      this.mainServer = new WebSocket(config.mainServer)

      const onOpenEvent = () => {
        if (!this.conference.peer){
          const msg:MSPeerMessage = {
            type:'connect',
            peer:participants.local.information.name.substring(0, 4),
          }
          this.sendWithPromise(msg, resolve, reject)
        }
      }
      const onMessageEvent = (ev: MessageEvent<any>)=> {
        const msg = JSON.parse(ev.data) as MSMessage
        const func = this.handlers.get(msg.type)
        if (func){
          func.bind(this)(msg)
        }else{
          console.error(`unhandled message ${msg.type} received`, msg)
        }
      }
      const onCloseEvent = () => {
        //console.log('onClose() for mainServer')
        setTimeout(()=>{
          this.mainServer = new WebSocket(config.mainServer)
          setEventHandler()
        }, 5 * 1000)
      }
      const onErrorEvent = () => {
        console.error(`Error in WebSocket for ${config.mainServer}`)
        this.mainServer?.close(3000, 'onError')
        onCloseEvent()
      }

      const setEventHandler = () => {
        this.mainServer?.addEventListener('error', onErrorEvent)
        this.mainServer?.addEventListener('message', onMessageEvent)
        this.mainServer?.addEventListener('open', onOpenEvent)
        this.mainServer?.addEventListener('close', onCloseEvent)
      }
      setEventHandler()
    })
    return promise
  }
  private onConnect(base: MSMessage){
    const msg = base as MSPeerMessage
    this.conference.peer = msg.peer
    this._store?.changeState('connected')
    if (this.mainServer){
      const roomMsg:MSRoomMessage = {
        type: 'join',
        peer:msg.peer,
        room: this.conference.name
      }
      console.log(`join sent ${JSON.stringify(roomMsg)}`)
      this.mainServer.send(JSON.stringify(roomMsg))
      this.loadDevice(msg.peer).then(()=>{
        this.conference.init()
        this.callMessageResolve(msg)
      })
    }else{
      this.callMessageReject(msg)
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

  public createTransport(dir: MSTransportDirection){
    const promise = new Promise<mediasoup.types.Transport>((resolve, reject) => {
      const msg:MSCreateTransportMessage = {
        type:'createTransport',
        peer:this.conference.peer,
        dir
      }
      this.sendWithPromise(msg, resolve, reject)
    })
    return promise
  }
  private onCreateTransport(base: MSMessage){
    const msg = base as MSCreateTransportReply
    const {type, peer, transport, ...params} = msg
    let transportObject:mediasoup.types.Transport|undefined
    if (msg.dir === 'send'){
      transportObject = this.device?.createSendTransport({...params, id:transport})
    }else{
      transportObject = this.device?.createRecvTransport({...params, id:transport})
    }
    this.callMessageResolve(msg, transportObject)
  }

  public connectTransport(transport: mediasoup.types.Transport, dtlsParameters: mediasoup.types.DtlsParameters){
    const promise = new Promise<string>((resolve, reject) => {
      const msg:MSConnectTransportMessage = {
        type:'connectTransport',
        peer:this.conference.peer,
        dtlsParameters,
        transport: transport.id,
      }
      this.sendWithPromise(msg, resolve, reject)
    })
    return promise
  }
  private onConnectTransport(base:MSMessage){
    const msg = base as MSConnectTransportReply
    if (msg.error){
      this.callMessageReject(msg, msg.error)
    }else{
      this.callMessageResolve(msg, '')
    }

  }

  public produceTransport(params:{transport:string, kind:mediasoup.types.MediaKind,
    role: MSTrackRole|string, rtpParameters:mediasoup.types.RtpParameters,
    paused:boolean, appData:any}){
    const promise = new Promise<string>((resolve, reject) => {
      const msg:MSProduceTransportMessage = {
        type:'produceTransport',
        peer:this.conference.peer,
        ...params,
      }
      this.sendWithPromise(msg, resolve, reject)
    })
    return promise
  }
  private onProduceTransport(base:MSMessage){
    const msg = base as MSProduceTransportReply
    if (msg.error){
      this.callMessageReject(msg, msg.error)
    }else{
      this.callMessageResolve(msg, msg.producer)
    }
  }

  public closeProducer(producer: string){
    const promise = new Promise<string>((resolve, reject) => {
      const msg:MSCloseProducerMessage = {
        type:'closeProducer',
        peer:this.conference.peer,
        producer
      }
      this.sendWithPromise(msg, resolve, reject)
    })
  }
  private onCloseProducer(base: MSMessage){
    const msg = base as MSCloseProducerReply

  }
  public consumeTransport(transport: string, producer:string){
    const promise = new Promise<mediasoup.types.ConsumerOptions>((resolve, reject) => {
      const msg:MSConsumeTransportMessage = {
        type:'consumeTransport',
        peer:this.conference.peer,
        rtpCapabilities: this.device!.rtpCapabilities,
        transport,
        producer,
      }
      this.sendWithPromise(msg, resolve, reject)
    })
    return promise
  }
  private onConsumeTransport(base:MSMessage){
    const msg = base as MSConsumeTransportReply
    if (msg.error){
      this.callMessageReject(msg, msg.error)
    }else{
      const consumerOptions: ConsumerOptions = {
        id: msg.consumer,
        producerId: msg.producer,
        kind: msg.kind,
        rtpParameters: msg.rtpParameters!
      }
      this.callMessageResolve(msg, consumerOptions)
    }
  }
  public resumeConsumer(consumer: string, ){
    const promise = new Promise<void>((resolve, reject) => {
      const msg:MSResumeConsumerMessage = {
        type:'resumeConsumer',
        peer:this.conference.peer,
        consumer
      }
      this.sendWithPromise(msg, resolve, reject)
    })
    return promise
  }
  private onResumeConsumer(base: MSMessage){
    const reply = base as MSResumeConsumerReply
    if(reply.error){
      this.callMessageReject(reply, reply.error)
    }else{
      this.callMessageResolve(reply)
    }
  }

  private onRemoteUpdate(base: MSMessage){
    const msg = base as MSRemoteUpdateMessage
    this.conference.onRemoteUpdate(msg.remotes)
  }
  private onRemoteLeft(base: MSMessage){
    const msg = base as MSRemoteLeftMessage
    this.conference.onRemoteLeft(msg.remotes)
  }

}
