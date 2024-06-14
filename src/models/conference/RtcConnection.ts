import {EventEmitter} from 'eventemitter3'
import {MSCreateTransportMessage, MSMessage, MSPeerMessage, MSConnectMessage, MSMessageType, MSRoomMessage,
  MSRTPCapabilitiesReply, MSTransportDirection, MSCreateTransportReply, MSConnectTransportMessage,
  MSConnectTransportReply, MSProduceTransportMessage, MSProduceTransportReply, MSTrackRole,
  MSConsumeTransportMessage, MSConsumeTransportReply, MSRemoteUpdateMessage, MSRemoteLeftMessage,
  MSResumeConsumerMessage, MSResumeConsumerReply, MSCloseProducerMessage, MSRemoteProducer,
  MSCloseProducerReply, MSStreamingStartMessage,MSUploadFileMessage, MSStreamingStopMessage, MSAddAdminMessage,
  MSPreConnectMessage,
  MSCheckAdminMessage,
  RoomLoginInfo} from './MediaMessages'
import * as mediasoup from 'mediasoup-client';
import {connLog} from '@models/utils'
import {RtcTransportStatsGot} from './RtcTransportStatsGot'
import {messageLoads} from '@stores/MessageLoads'

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
const rtcLog = connLog()

const SEND_INTERVAL = 10 * 1000

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
  private lastSendTime = 0

  public constructor(){
    this.handlers.set('preConnect', this.onPreConnect)
    this.handlers.set('connect', this.onConnect)
    this.handlers.set('pong', ()=>{})
    this.handlers.set('createTransport', this.onCreateTransport)
    this.handlers.set('rtpCapabilities', this.onRtpCapabilities)
    this.handlers.set('connectTransport', this.onConnectTransport)
    this.handlers.set('produceTransport', this.onProduceTransport)
    this.handlers.set('closeProducer', this.onCloseProducer)
    this.handlers.set('consumeTransport', this.onConsumeTransport)
    this.handlers.set('resumeConsumer', this.onResumeConsumer)
    this.handlers.set('remoteUpdate', this.onRemoteUpdate)
    this.handlers.set('remoteLeft', this.onRemoteLeft)
    this.handlers.set('uploadFile', this.onUploadFile)
    this.handlers.set('addAdmin', this.onAddRemoveAdminLogin)
    this.handlers.set('removeAdmin', this.onAddRemoveAdminLogin)
    this.handlers.set('addLogin', this.onAddRemoveAdminLogin)
    this.handlers.set('removeLogin', this.onAddRemoveAdminLogin)
    this.handlers.set('checkAdmin', this.onCheckAdmin)
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

  rtcQueue = Array<MSMessage>()
  readonly INTERVAL = 100
  private interval=0
  private startProcessMessage(){  //  start interval timer to process message queue.
    if (!this.interval)
      this.interval = window.setInterval(this.processMessage.bind(this), this.INTERVAL)
  }
  private processMessage(){
    if (this.mainServer && this.mainServer.readyState === WebSocket.CONNECTING){
      return  //  wait until OEPN.
    }
    if (this.mainServer && this.mainServer.readyState === WebSocket.OPEN){
      let now = Date.now()
      if (now > this.lastSendTime + SEND_INTERVAL){
        const msg:MSMessage = {
          type: 'pong'
        }
        rtcLog("RtcC: pong sent.")
        this.mainServer.send(JSON.stringify(msg))
        this.lastSendTime = now
      }
      const timeToProcess = this.INTERVAL * 0.5
      const deadline = now + timeToProcess
      while(this.rtcQueue.length && now < deadline){
        const msg = this.rtcQueue.shift()!
        rtcLog(`RtcC: processMessag(${msg.type})`, msg)
        const func = this.handlers.get(msg.type)
        if (func){
          func.bind(this)(msg)
        }else{
          console.error(`unhandled message ${msg.type} received`, msg)
        }
        now = Date.now()
      }
      messageLoads.loadRtc = (now - (deadline-timeToProcess)) / timeToProcess
    }else if (this.rtcQueue.length > 0){
      console.error(`mainServer.readyState === '${this.mainServer?.readyState}' and mesgs in queue: ${JSON.stringify(this.rtcQueue)}.`)
    }
    //  Stop interval timer when disconnected and no messages in queue.
    if (!this.isConnected() && this.rtcQueue.length===0 && this.interval){
      window.clearInterval(this.interval)
      this.interval = 0
    }
  }


  // Converts a File object to a base64 string.
  public fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
  // add admin to the room
  public addAdmin(email: string){
    const promise = new Promise<undefined>((resolve, reject)=>{
      const msg:MSAddAdminMessage = {
        type:'addAdmin',
        email: email,
      }
      this.sendWithPromise(msg, resolve, reject)
    });
    return promise
  }
  // remove admin from the room
  public removeAdmin(email: string){
    const promise = new Promise<undefined>((resolve, reject)=>{
      const msg:MSAddAdminMessage = {
        type:'removeAdmin',
        email: email,
      }
      this.sendWithPromise(msg, resolve, reject)
    });
    return promise
  }
  // add login suffix to the room
  public addLoginSuffix(suffix: string){
    const promise = new Promise<undefined>((resolve, reject)=>{
      const msg:MSAddAdminMessage = {
        type:'addLogin',
        email: suffix,
      }
      this.sendWithPromise(msg, resolve, reject)
    });
    return promise
  }
  // remove login suffix from the room
  public removeLoginSuffix(suffix: string){
    const promise = new Promise<undefined>((resolve, reject)=>{
      const msg:MSAddAdminMessage = {
        type:'removeLogin',
        email: suffix,
      }
      this.sendWithPromise(msg, resolve, reject)
    });
    return promise
  }
  private onAddRemoveAdminLogin(base:MSMessage){
    const msg = base as MSAddAdminMessage
    if (msg.result === 'approve'){
      this.resolveMessage(msg, msg.loginInfo)
    }else{
      this.rejectMessage(msg)
    }
  }

  // Check if the user is admin
  public checkAdmin(room: string, email?: string, token?: string){
    const promise = new Promise<RoomLoginInfo|undefined>((resolve, reject)=>{
      const msg:MSCheckAdminMessage = {
        type:'checkAdmin',
        room: room,
        email: email,
        token: token,
      }
      this.sendWithPromise(msg, resolve, reject)
    });
    return promise
  }
  private onCheckAdmin(base:MSMessage){
    const msg = base as MSCheckAdminMessage
    if (msg.result === 'approve'){
      this.resolveMessage(msg, msg.loginInfo)
    }else{
      this.rejectMessage(msg)
    }
  }

  // Upload file to google drive
  public uploadFile(file:File):Promise<string>{

    const promise = new Promise<string>(async (resolve, reject)=>{
      this.connected = true
      if (this.mainServer && this.mainServer.readyState === WebSocket.OPEN){
        const fileBase64 = await this.fileToBase64(file);
        const msg: MSUploadFileMessage = {
          type:'uploadFile',
          file: fileBase64,
          fileName: file.name,
        }
        this.setMessagePromise(msg, resolve, reject)
        this.mainServer.send(JSON.stringify(msg))
      }
      else{
        console.log("mainServer not open")
      }
      const onOpenEvent = async () => {
      }
      const onMessageEvent = (ev: MessageEvent<any>)=> {
        const msg = JSON.parse(ev.data) as MSMessage
        //rtcLog(`onMessage(${msg.type})`)
        this.rtcQueue.push(msg)
      }
      const onCloseEvent = () => {
        //rtcLog('onClose() for mainServer')
        console.log('onClose() for mainServer')
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
    });
    return promise

  }

  /// Create websocket to the main server and ask whether the room requires login or not
  public preConnect(room: string){
    const promise = new Promise<boolean>((resolve, reject)=>{
      this.connected = true
      this.startProcessMessage()
      try{
        this.mainServer = new WebSocket(config.mainServer)
      }
      catch(e){
        this.disconnect(3000, 'e')
        reject(e)
      }
      const onOpenEvent = () => {
        const msg:MSPreConnectMessage = {
          type:'preConnect',
          room,
        }
        if (this.mainServer && this.mainServer.readyState === WebSocket.OPEN){
          this.setMessagePromise(msg, resolve, reject, room)
          this.mainServer.send(JSON.stringify(msg))
        }
      }
      const onMessageEvent = (ev: MessageEvent<any>)=> {
        const msg = JSON.parse(ev.data) as MSMessage
        rtcLog(`onMessage(${msg.type})`)
        this.rtcQueue.push(msg)
      }
      const onCloseEvent = () => {
        rtcLog('onClose() for mainServer')
        this.disconnect()
      }
      const onErrorEvent = (ev:any) => {
        console.error(`Error in WebSocket for ${config.mainServer}`, ev)
        this.disconnect(3000, 'onError')
      }

      const setEventHandler = () => {
        this.mainServer?.addEventListener('error', onErrorEvent)
        this.mainServer?.addEventListener('message', onMessageEvent)
        this.mainServer?.addEventListener('open', onOpenEvent)
        this.mainServer?.addEventListener('close', onCloseEvent)
      }
      setEventHandler()
    });
    return promise
  }
  private onPreConnect(base: MSMessage){
    const msg = base as MSPreConnectMessage
    this.resolveMessage(msg, msg.login ? true : false)
  }

  //  connect to main server. return my peer id got.
  public connect(room: string, peer: string, token?: string, email?: string){
    if (!this.mainServer){
      console.error(`RTCConnection: preConnect() must be called before connect().`)
    }
    rtcLog(`RtcC: connect(${room}, ${peer}, ${token}, ${email})`)
    const promise = new Promise<string>((resolve, reject)=>{
      this.connected = true
      const msg:MSConnectMessage = {
        type:'connect',
        peer,
        room,
        token,
        email,
      }
      if (this.prevPeer) {
        msg.peerJustBefore = this.prevPeer
        rtcLog(`reconnect with previous peer id '${this.prevPeer}'`)
      }
      this.sendWithPromise(msg, resolve, reject)
    })
    return promise
  }
  private onConnect(base: MSMessage){
    rtcLog(`RtcC: onConnect( ${JSON.stringify(base)}`)
    const msg = base as MSConnectMessage
    if (msg.error){
      //  console.log(`onConnect failed: ${msg.error}`)
      this.rejectMessage(msg)
    }else{
      this.peer_ = msg.peer
      if (this.mainServer){
        const joinMsg:MSRoomMessage = {
          type: 'join',
          peer:msg.peer,
          room:msg.room
        }
        rtcLog(`RtcC: join sent ${JSON.stringify(joinMsg)}`)
        this.mainServer.send(JSON.stringify(joinMsg))
        this.lastSendTime = Date.now()
        this.loadDevice(msg.peer).then(()=>{
          rtcLog(`RtcC: loadDevice success.`)
          this.resolveMessage(msg, msg.peer)
          this.emitter.emit('connect')
          //  this.startPingPong()
        })
      }else{
        this.rejectMessage(msg)
        throw new Error('No connection has been established.')
      }
    }
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
    console.warn(`RTCConnection disconnect() called.`)
    const promise = new Promise<void>((resolve)=>{
      const func = ()=>{
        if (this.mainServer && this.mainServer.readyState === WebSocket.OPEN && this.mainServer.bufferedAmount){
          window.setTimeout(func, 100)
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
      this.lastSendTime = Date.now()
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

  private onUploadFile(base:MSMessage){
    const msg = base as MSUploadFileMessage
    if (msg.error){
      console.log("onUploadFile error")
      this.resolveMessage(msg, false)
    }else{
      this.resolveMessage(msg, msg.fileID)
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
    this.lastSendTime = Date.now()
  }
  public streamingStop(id: string){
    const msg:MSStreamingStopMessage = {
      type: 'streamingStop',
      peer: this.peer,
      id
    }
    this.mainServer?.send(JSON.stringify(msg))
    this.lastSendTime = Date.now()
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
