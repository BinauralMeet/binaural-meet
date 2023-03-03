import {EventEmitter} from 'events'
import {MSCreateTransportMessage, MSMessage, MSPeerMessage, MSConnectMessage, MSMessageType, MSRoomMessage,
  MSRTPCapabilitiesReply, MSTransportDirection, MSCreateTransportReply, MSConnectTransportMessage,
  MSConnectTransportReply, MSProduceTransportMessage, MSProduceTransportReply, MSTrackRole,
  MSConsumeTransportMessage, MSConsumeTransportReply, MSRemoteUpdateMessage, MSRemoteLeftMessage,
  MSResumeConsumerMessage, MSResumeConsumerReply, MSCloseProducerMessage, MSRemoteProducer,
  MSCloseProducerReply,
  MSStreamingStartMessage,
  MSStreamingStopMessage} from './MediaMessages'
import * as mediasoup from 'mediasoup-client';
import {connLog} from './ConferenceLog'
import {RtcTransportStatsGot} from './RtcTransportStatsGot'

export type TrackRoles = 'avatar' | 'mainScreen' | string
export type TrackKind = 'audio' | 'video'

export interface MSTrack{
  track: MediaStreamTrack,
  peer: string,
  role: TrackRoles,
  deviceId?: string,
}

export interface LocalProducer{
  id: string
  role: string | TrackRoles
  producer: mediasoup.types.Producer
}
export interface RemoteProducer extends MSRemoteProducer{
  peer: RemotePeer                    //  remote peer
  consumer?: mediasoup.types.Consumer //  consumer for the remote producer
}
export interface RemotePeer{
  peer: string
  transport?: mediasoup.types.Transport   // receive transport
  transportPromise?: Promise<mediasoup.types.Transport>  // set during creating receive transport
  producers: RemoteProducer[]             // producers of the remote peer
}

// config.js
declare const config:any                  //  from ../../config.js included from index.html

//  Log level and module log options
const rtcLog = connLog

type RtcConnectionEvent = 'remoteUpdate' | 'remoteLeft' | 'connect' | 'disconnect'

export class RtcConnection{
  private peer_=''
  private prevPeer=''
  private connected = false
  get peer() {return this.peer_}
  private mainServer?:WebSocket
  public device?:mediasoup.Device
  private handlers = new Map<MSMessageType, (msg: MSMessage)=>void>()
  private promises = new Map<number, {resolve:(a:any)=>void, reject?:(a:any)=>void, arg?:any} >()
  private messageNumber = 1

  public constructor(){
    this.handlers.set('connect', this.onConnect)
    this.handlers.set('ping', ()=>{})
    this.handlers.set('createTransport', this.onCreateTransport)
    this.handlers.set('rtpCapabilities', this.onRtpCapabilities)
    this.handlers.set('connectTransport', this.onConnectTransport)
    this.handlers.set('produceTransport', this.onProduceTransport)
    this.handlers.set('closeProducer', this.onCloseProducer)
    this.handlers.set('consumeTransport', this.onConsumeTransport)
    this.handlers.set('resumeConsumer', this.onResumeConsumer)
    this.handlers.set('remoteUpdate', this.onRemoteUpdate)
    this.handlers.set('remoteLeft', this.onRemoteLeft)
    try{
      this.device = new mediasoup.Device();
    }catch (error:any){
      if (error.name === 'UnsupportedError')
        console.warn('browser not supported');
    }
  }

  public isConnected(){
    return this.connected && this.mainServer?.readyState === WebSocket.OPEN
  }


  //  connect to main server. return my peer id got.
  public connect(room: string, peer: string){
    rtcLog(`rtcConn connect(${room}, ${peer})`)
    const promise = new Promise<string>((resolve, reject)=>{
      this.connected = true
      try{
        this.mainServer = new WebSocket(config.mainServer)
      }
      catch(e){
        this.disconnect(3000, 'e')
        reject(e)
      }
      const onOpenEvent = () => {
        const msg:MSConnectMessage = {
          type:'connect',
          peer,
        }
        if (this.prevPeer) {
          msg.peerJustBefore = this.prevPeer
          rtcLog(`reconnect with previous peer id '${this.prevPeer}'`)
        }
        this.sendWithPromise(msg, resolve, reject, room)
      }
      const onMessageEvent = (ev: MessageEvent<any>)=> {
        const msg = JSON.parse(ev.data) as MSMessage
        this.onAnyMessageForPing()
        const func = this.handlers.get(msg.type)
        if (func){
          func.bind(this)(msg)
        }else{
          console.error(`unhandled message ${msg.type} received`, msg)
        }
      }
      const onCloseEvent = () => {
        rtcLog('onClose() for mainServer')
        this.disconnect()
      }
      const onErrorEvent = () => {
        console.error(`Error in WebSocket for ${config.mainServer}`)
        this.disconnect(3000, 'onError')
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
  public leave(){
    const msg:MSMessage = {
      type:'leave'
    }
    if (this.mainServer && this.mainServer.readyState === WebSocket.OPEN){
      this.mainServer.send(JSON.stringify(msg))
      return true
    }
    return false
  }
  public disconnect(code?:number, msg?:string){
    const promise = new Promise<void>((resolve)=>{
      const func = ()=>{
        if (this.mainServer && this.mainServer.readyState === WebSocket.OPEN && this.mainServer.bufferedAmount){
          setTimeout(func, 100)
        }else{
          if (this.mainServer?.readyState !== WebSocket.CLOSING
            && this.mainServer?.readyState !== WebSocket.CLOSED){
            this.mainServer?.close(code, msg)
          }
          if (this.connected){
            this.connected = false
            this.emit('disconnect')
            rtcLog(`mainServer emits 'disconnect'`)
          }
          this.mainServer = undefined
          if (this.peer_){
            this.prevPeer = this.peer_
            this.peer_ = ''
          }
          resolve()
        }
      }
      func()
    })
    return promise
  }
  public forceClose(){
    this.mainServer?.close(3000)
  }

  private setMessageSerialNumber(msg: MSMessage){
    this.messageNumber++;
    msg.sn = this.messageNumber
  }
  private setMessagePromise(msg:MSMessage, resolve:(a:any)=>void, reject?:(reson:any)=>void, arg?:any){
    this.setMessageSerialNumber(msg)
    this.promises.set(msg.sn!, {resolve, reject, arg})
  }
  private getMessageArg(msg:MSMessage){
    if (msg.sn){
      return this.promises.get(msg.sn)?.arg
    }
  }
  private sendWithPromise(msg:MSMessage, resolve:(a:any)=>void, reject?:(reson:any)=>void, arg?:any){
    if (!this.mainServer) {
      if (reject){
        reject('no mainServer')
      }
    }else{
      this.setMessagePromise(msg, resolve, reject, arg)
      this.mainServer.send(JSON.stringify(msg))
    }
  }
  private resolveMessage(m: MSMessage, a?:any){
    const sn = m.sn
    if (sn){
      this.promises.get(sn)?.resolve(a)
      this.promises.delete(sn)
    }
  }
  private rejectMessage(m: MSMessage, a?:any){
    const sn = m.sn
    if (sn){
      const reject = this.promises.get(sn)?.reject
      if (reject) reject(a)
      this.promises.delete(sn)
    }
  }

  private loadDevice(peer: string){
    const promise = new Promise<void>((resolve, reject)=>{
      const msg:MSPeerMessage = {
        type:'rtpCapabilities',
        peer
      }
      this.sendWithPromise(msg, resolve, reject)
    })
    return promise
  }
  private onRtpCapabilities(base: MSMessage){
    const msg = base as MSRTPCapabilitiesReply
    //console.log('Device cap:', msg.rtpCapabilities)
    if (this.device?.loaded){
      this.resolveMessage(base)
    }else{
      this.device?.load({routerRtpCapabilities: msg.rtpCapabilities}).then(()=>{
        this.resolveMessage(base)
      })
    }
  }

  private onConnect(base: MSMessage){
    rtcLog(`onConnect( ${JSON.stringify(base)}`)
    const msg = base as MSPeerMessage
    this.peer_ = msg.peer
    const room = this.getMessageArg(msg) as string
    if (this.mainServer){
      const joinMsg:MSRoomMessage = {
        type: 'join',
        peer:msg.peer,
        room
      }
      rtcLog(`join sent ${JSON.stringify(joinMsg)}`)
      this.mainServer.send(JSON.stringify(joinMsg))
      this.loadDevice(msg.peer).then(()=>{
        this.resolveMessage(msg, msg.peer)
        this.emitter.emit('connect')
        this.startPingPong()
      })
    }else{
      this.rejectMessage(msg)
      throw new Error('No connection has been established.')
    }
  }
  readonly pingPongTimeout = 3000
  private pingCount = 0
  private pingTimeout?:NodeJS.Timeout = undefined
  private pingTimerFunc = () => {
    this.pingTimeout = undefined
    if (this.pingCount <= 1){
      if (this.mainServer?.readyState === WebSocket.OPEN){
        const msg: MSMessage = {type:'ping'}
        this.mainServer!.send(JSON.stringify(msg))
        this.pingCount += 1
        this.pingTimeout = setTimeout(this.pingTimerFunc, this.pingPongTimeout)
        rtcLog(`pingTimerFunc() ping sent. count=${this.pingCount}.`)
      }else{
        console.warn('RtcConnection: Not opened and can not send ping.')
        this.pingCount = 0
      }
    }else{  //  Did not receive any message after sending two ping messages.
      console.warn(`RtcConnection: Ping pong time out. count=${this.pingCount}`)
      this.pingCount = 0
      if (this.connected){
        this.disconnect(3000, 'ping pong time out.')
      }
    }
  }
  private startPingPong(){
    const msg: MSMessage = {type:'ping'}
    this.mainServer?.send(JSON.stringify(msg))
    this.pingCount = 1
    if (this.pingTimeout){
      console.error(`this.pingTimeout already set to ${this.pingTimeout}`)
    }
    this.pingTimeout = setTimeout(this.pingTimerFunc, this.pingPongTimeout)
    rtcLog(`startPingPong() called. ping sent. count=${this.pingCount}.`)
  }
  private onAnyMessageForPing(){
    this.pingCount = 0
    if (this.pingTimeout){
      clearTimeout(this.pingTimeout)
      this.pingTimeout = setTimeout(this.pingTimerFunc, this.pingPongTimeout)
    }
  }

  public createTransport(dir: MSTransportDirection, remote?: RemotePeer){
    if (dir === 'receive' && !remote){
      console.error(`createTransport(): remote must be specified.`)
    }
    const promise = new Promise<mediasoup.types.Transport>((resolve, reject) => {
      const msg:MSCreateTransportMessage = {
        type:'createTransport',
        peer:this.peer,
        remote:remote?.peer,
        dir
      }
      this.sendWithPromise(msg, resolve, reject, remote)
    })
    return promise
  }
  private onCreateTransport(base: MSMessage){
    const msg = base as MSCreateTransportReply
    const {type, peer, transport, iceServers, ...params} = msg
    const option: mediasoup.types.TransportOptions = {
      id:transport,
      ...params,
      iceServers,
      iceTransportPolicy: 'all',
    }

    let transportObject:mediasoup.types.Transport|undefined
    if (msg.dir === 'send'){
      transportObject = this.device?.createSendTransport(option)
    }else{
      transportObject = this.device?.createRecvTransport(option)
    }
    if (transportObject){
      const remote = this.getMessageArg(msg)
      if (!transportObject.appData.stat){
        transportObject.appData.stat = new RtcTransportStatsGot(msg.dir, remote)
      }
      this.resolveMessage(msg, transportObject)
    }
    this.rejectMessage(msg)
  }

  public connectTransport(transport: mediasoup.types.Transport, dtlsParameters: mediasoup.types.DtlsParameters, remote?:string){
    const promise = new Promise<string>((resolve, reject) => {
      const msg:MSConnectTransportMessage = {
        type:'connectTransport',
        peer:this.peer,
        remote,
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
      this.rejectMessage(msg, msg.error)
    }else{
      this.resolveMessage(msg, '')
    }

  }

  public produceTransport(params:{transport:string, kind:mediasoup.types.MediaKind,
    role: MSTrackRole|string, rtpParameters:mediasoup.types.RtpParameters,
    paused:boolean, appData:any}){
    const promise = new Promise<string>((resolve, reject) => {
      const msg:MSProduceTransportMessage = {
        type:'produceTransport',
        peer:this.peer,
        ...params,
      }
      this.sendWithPromise(msg, resolve, reject)
    })
    return promise
  }
  private onProduceTransport(base:MSMessage){
    const msg = base as MSProduceTransportReply
    if (msg.error){
      this.rejectMessage(msg, msg.error)
    }else{
      this.resolveMessage(msg, msg.producer)
    }
  }

  public closeProducer(producer: string){
    const promise = new Promise<string>((resolve, reject) => {
      const msg:MSCloseProducerMessage = {
        type:'closeProducer',
        peer:this.peer,
        producer
      }
      this.sendWithPromise(msg, resolve, reject)
    })
    return promise
  }
  private onCloseProducer(base: MSMessage){
    const msg = base as MSCloseProducerReply
    if (msg.error){
      this.rejectMessage(msg, msg.error)
    }else{
      this.resolveMessage(msg)
    }
  }
  public consumeTransport(transport: string, producer:RemoteProducer){
    const promise = new Promise<mediasoup.types.ConsumerOptions>((resolve, reject) => {
      const msg:MSConsumeTransportMessage = {
        type:'consumeTransport',
        peer:this.peer,
        remote: producer.peer.peer,
        rtpCapabilities: this.device!.rtpCapabilities,
        transport,
        producer:producer.id,
      }
      this.sendWithPromise(msg, resolve, reject)
    })
    return promise
  }
  private onConsumeTransport(base:MSMessage){
    const msg = base as MSConsumeTransportReply
    if (msg.error){
      this.rejectMessage(msg, msg.error)
    }else{
      const consumerOptions: mediasoup.types.ConsumerOptions = {
        id: msg.consumer,
        producerId: msg.producer,
        kind: msg.kind,
        rtpParameters: msg.rtpParameters!
      }
      this.resolveMessage(msg, consumerOptions)
    }
  }
  public resumeConsumer(consumer: string, remote: string){
    const promise = new Promise<void>((resolve, reject) => {
      const msg:MSResumeConsumerMessage = {
        type:'resumeConsumer',
        peer:this.peer,
        remote: remote,
        consumer
      }
      this.sendWithPromise(msg, resolve, reject)
    })
    return promise
  }
  private onResumeConsumer(base: MSMessage){
    const reply = base as MSResumeConsumerReply
    if(reply.error){
      this.rejectMessage(reply, reply.error)
    }else{
      this.resolveMessage(reply)
    }
  }

  public streamingStart(id: string, producers: mediasoup.types.Producer[]){
    const msg:MSStreamingStartMessage = {
      type: 'streamingStart',
      peer: this.peer,
      producers: producers.map(p => p.id),
      id
    }
    this.mainServer?.send(JSON.stringify(msg))
  }
  public streamingStop(id: string){
    const msg:MSStreamingStopMessage = {
      type: 'streamingStop',
      peer: this.peer,
      id
    }
    this.mainServer?.send(JSON.stringify(msg))
  }

  private emitter = new EventEmitter()
  public addListener(event:RtcConnectionEvent, listener:(...args:any[])=>void){
    this.emitter.addListener(event, listener)
  }
  public removeListener(event:RtcConnectionEvent, listener:(...args:any[])=>void){
    this.emitter.removeListener(event, listener)
  }
  public removeAllListener(){
    this.emitter.removeAllListeners()
  }
  private emit(event:RtcConnectionEvent, ...args: any[]){
    this.emitter.emit(event, args)
  }

  private onRemoteUpdate(base: MSMessage){
    const msg = base as MSRemoteUpdateMessage
    this.emit('remoteUpdate', msg.remotes)
  }
  private onRemoteLeft(base: MSMessage){
    const msg = base as MSRemoteLeftMessage
    this.emit('remoteLeft', msg.remotes)
  }
}
