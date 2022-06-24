import {EventEmitter} from 'events'
import {RemoteProducer} from './Conference'
import {MSCreateTransportMessage, MSMessage, MSPeerMessage, MSMessageType, MSRoomMessage, MSRTPCapabilitiesReply,
  MSTransportDirection, MSCreateTransportReply, MSConnectTransportMessage, MSConnectTransportReply,
  MSProduceTransportMessage, MSProduceTransportReply, MSTrackRole, MSConsumeTransportMessage, MSConsumeTransportReply, MSRemoteUpdateMessage, MSRemoteLeftMessage, MSResumeConsumerMessage, MSResumeConsumerReply, MSCloseProducerMessage, MSCloseProducerReply} from './MediaMessages'
import * as mediasoup from 'mediasoup-client';

// config.js
declare const config:any                  //  from ../../config.js included from index.html

//  Log level and module log options
export const TRACKLOG = false        // show add, remove... of tracks
export const CONNECTIONLOG = false
export const trackLog = TRACKLOG ? console.log : (a:any) => {}
export const connLog = CONNECTIONLOG ? console.log : (a:any) => {}
export const connDebug = CONNECTIONLOG ? console.debug : (a:any) => {}

type RtcConnectionEvent = 'remoteUpdate' | 'remoteLeft'

export class RtcConnection{
  private peer_=''
  get peer() {return this.peer_}
  private mainServer?:WebSocket
  private device?:mediasoup.Device
  private handlers = new Map<MSMessageType, (msg: MSMessage)=>void>()
  private promises = new Map<number, {resolve:(a:any)=>void, reject?:(a:any)=>void, arg?:any} >()
  private messageNumber = 1

  public constructor(){
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
    try{
      this.device = new mediasoup.Device();
    }catch (error:any){
      if (error.name === 'UnsupportedError')
        console.warn('browser not supported');
    }
  }

  public isConnected(){
    return this.mainServer?.readyState === WebSocket.OPEN
  }

  //  connect to main server. return my peer id got.
  public connect(room: string, peer: string){
    const promise = new Promise<string>((resolve, reject)=>{
      this.mainServer = new WebSocket(config.mainServer)
      const onOpenEvent = () => {
        const msg:MSPeerMessage = {
          type:'connect',
          peer,
        }
        this.sendWithPromise(msg, resolve, reject, room)
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
  public disconnect(){
    this.mainServer?.close()
    this.peer_ = ''
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
    this.device?.load({routerRtpCapabilities: msg.rtpCapabilities}).then(()=>{
      this.resolveMessage(base)
    })
  }

  private onConnect(base: MSMessage){
    const msg = base as MSPeerMessage
    this.peer_ = msg.peer
    const room = this.getMessageArg(msg) as string
    if (this.mainServer){
      const roomMsg:MSRoomMessage = {
        type: 'join',
        peer:msg.peer,
        room
      }
      //console.log(`join sent ${JSON.stringify(roomMsg)}`)
      this.mainServer.send(JSON.stringify(roomMsg))
      this.loadDevice(msg.peer).then(()=>{
        this.resolveMessage(msg, msg.peer)
      })
    }else{
      this.rejectMessage(msg)
      throw new Error('No connection has been established.')
    }
  }

  public createTransport(dir: MSTransportDirection, remote?: string){
    if (dir === 'receive' && !remote){
      console.error(`createTransport(): remote must be specified.`)
    }
    const promise = new Promise<mediasoup.types.Transport>((resolve, reject) => {
      const msg:MSCreateTransportMessage = {
        type:'createTransport',
        peer:this.peer,
        remote,
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
    this.resolveMessage(msg, transportObject)
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
