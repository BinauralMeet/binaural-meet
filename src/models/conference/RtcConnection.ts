import {EventEmitter} from 'events'
import {RemoteProducer} from './Conference'
import {MSCreateTransportMessage, MSMessage, MSPeerMessage, MSConnectMessage, MSMessageType, MSRoomMessage, MSRTPCapabilitiesReply,
  MSTransportDirection, MSCreateTransportReply, MSConnectTransportMessage, MSConnectTransportReply,
  MSProduceTransportMessage, MSProduceTransportReply, MSTrackRole, MSConsumeTransportMessage, MSConsumeTransportReply, MSRemoteUpdateMessage, MSRemoteLeftMessage, MSResumeConsumerMessage, MSResumeConsumerReply, MSCloseProducerMessage, MSCloseProducerReply} from './MediaMessages'
import * as mediasoup from 'mediasoup-client';
import { makeObservable, observable } from 'mobx';
import participants from '@stores/participants/Participants';
import {connLog} from './ConferenceLog'

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
  private device?:mediasoup.Device
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
          connLog(`reconnect with previous peer id '${this.prevPeer}'`)
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
          if (this.mainServer?.readyState !== WebSocket.CLOSING || this.mainServer?.readyState !== WebSocket.CLOSED){
            this.mainServer?.close(code, msg)
          }
          if (this.connected){
            this.connected = false
            this.emit('disconnect')
            connLog(`mainServer emits 'disconnect'`)
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
        connLog(`pingTimerFunc() ping sent. count=${this.pingCount}.`)
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
    connLog(`startPingPong() called. ping sent. count=${this.pingCount}.`)
  }
  private onAnyMessageForPing(){
    this.pingCount = 0
    if (this.pingTimeout){
      clearTimeout(this.pingTimeout)
      this.pingTimeout = setTimeout(this.pingTimerFunc, this.pingPongTimeout)
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
        transportObject.appData.stat = new TransportStat(msg.dir, remote)
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


export interface RTCRemoteInboundRtpStreamStats extends RTCReceivedRtpStreamStats {
  localId: string
  roundTripTime: number
  totalRoundTripTime: number
  fractionLost: number
  roundTripTimeMeasurements: number
}
export interface RTCRemoteOutboundRtpStreamStats extends RTCSentRtpStreamStats {
  localId: string
  roundTripTime: number
  totalRoundTripTime: number
  fractionLost: number
  roundTripTimeMeasurements: number
}

export interface RTCCodecStats extends RTCStats{
  payloadType:number
  trnsportId:string
  mimeType:string
  clockRate:number
  channels:number
  sdpFmtpLine:string
}
export interface RTCIceCandidateEx extends RTCIceCandidate{
  url?: string
}

export class StreamStat{
  id: string=''
  dir: MSTransportDirection='send'
  @observable bytesPerSec?:number
  @observable codec?: string
  @observable targetBitrate?: number
  @observable fractionLost?: number
  @observable roundTripTime?: number
  @observable jitter?: number
  constructor(){
    makeObservable(this)
  }
}
export class TransportStat{
  id=''
  dir:MSTransportDirection
  remote?:string
  @observable fractionLost?:number
  @observable roundTripTime?:number
  @observable jitter?:number
  @observable timestamp:number=0
  @observable receivedBytePerSec?:number
  @observable sentBytePerSec?:number
  @observable bytesSent:number=0
  @observable bytesReceived:number=0
  @observable turn?: string
  @observable localServer?: string
  @observable remoteServer?: string
  @observable streams: StreamStat[]=[]
  @observable quality?: number  //  0 - 100, 100 is best
  outStreamsPrev = new Map<string, RTCOutStreamStat>()
  inStreamsPrev = new Map<string, RTCInStreamStat>()
  constructor(dir_:MSTransportDirection, remote_?:string){
    this.dir = dir_
    this.remote = remote_
    makeObservable(this)
  }
}

interface RTCOutboundRtpStreamStatsEx extends RTCOutboundRtpStreamStats{
  targetBitrate?: number
}
interface RTCInboundRtpStreamStatsEx extends RTCInboundRtpStreamStats{
  bytesReceived: number

}

export interface RTCOutStreamStat{
  id: string
  local: RTCOutboundRtpStreamStatsEx
  remote?: RTCRemoteInboundRtpStreamStats
}
export interface RTCInStreamStat{
  id: string
  local: RTCInboundRtpStreamStatsEx
  remote?: RTCRemoteOutboundRtpStreamStats
}

export function getStatFromTransport(transport?: mediasoup.types.Transport){
  return transport?.appData.stat as TransportStat|undefined
}

export function updateTransportStat(transport: mediasoup.types.Transport){
  const tStat = transport.appData.stat as TransportStat
  transport?.getStats().then((stats)=>{
    const types = new Map<string, Map<string, any> >()
    stats.forEach((val)=>{
      if (val.type){
        if (types.has(val.type)){
          types.get(val.type)!.set(val.id, val)
        }else{
          types.set(val.type, new Map<string, any>([[val.id, val]]))
        }
      }
    })
    /*
    const keys = Array.from(stats.keys())
    //  log all stats
    if (dir !== 'send'){
      let str=''
      keys.forEach((key)=>{ str = `${str}\n${key}:${JSON.stringify(stats.get(key))}` })
      console.log(str)
    }
    //  */
    let streamStats:StreamStat[]=[]
    if (tStat.dir === 'send'){
      const outRtps = types.get('outbound-rtp')
      const streams:{id:string, local:RTCOutboundRtpStreamStatsEx, remote: RTCRemoteInboundRtpStreamStats|undefined}[] = []
      outRtps?.forEach((r)=>{
        const outRtp = r as RTCOutboundRtpStreamStatsEx
        const remoteId = outRtp.remoteId
        const remoteInRtp = remoteId && stats.get(remoteId)
        streams.push({id:`${outRtp.id}_${transport.id}`, local:outRtp, remote: remoteInRtp})
      })
      streamStats = streams.map(stream => {
        const prev = tStat.outStreamsPrev.get(stream.id)
        const dt = prev?.local?.timestamp ? (stream.local.timestamp - prev.local.timestamp)/1000 : 0

        if (stream.local.codecId){
          stats.get(stream.local.codecId)
        }
        const rv:StreamStat = {
          dir: tStat.dir,
          id: stream.id,
          bytesPerSec: (dt && stream.local.bytesSent && prev?.local?.bytesSent) ?
            (stream.local.bytesSent-prev.local.bytesSent)/dt : 0,
          codec: stream.local.codecId ? (stats.get(stream.local.codecId) as RTCCodecStats).mimeType : undefined,
          targetBitrate: stream.local.targetBitrate,
          //jitter: stream.remote?.jitter,
          fractionLost: stream.remote?.fractionLost,
          roundTripTime: stream.remote?.roundTripTime
        }
        return rv
      })
      tStat.outStreamsPrev = new Map(streams.map((s) => [s.id, s]))
    }else{
      const inRtps = types.get('inbound-rtp')
      //console.log(`inRtps:keys=${inRtps && Array.from(inRtps.keys())}`)
      const streams:{id:string, local:RTCInboundRtpStreamStatsEx, remote: RTCRemoteOutboundRtpStreamStats|undefined}[] = []
      inRtps?.forEach((inRtp:RTCInboundRtpStreamStatsEx)=>{
        const remoteId = inRtp.remoteId
        const remoteOutRtp = remoteId && stats.get(remoteId)
        streams.push({id:`${inRtp.id}_${transport.id}`, local:inRtp, remote: remoteOutRtp})
      })
      streamStats = streams.map(stream => {
        const prev = tStat.inStreamsPrev.get(stream.id)
        const dt = prev?.local?.timestamp ? (stream.local.timestamp - prev.local.timestamp)/1000 : 0

        if (stream.local.codecId){
          stats.get(stream.local.codecId)
        }
        const rv:StreamStat = {
          dir: tStat.dir,
          id: stream.id,
          bytesPerSec: (dt && stream.local.bytesReceived && prev?.local?.bytesReceived) ?
            (stream.local.bytesReceived -prev.local.bytesReceived)/dt : 0,
          codec: stream.local.codecId ? (stats.get(stream.local.codecId) as RTCCodecStats).mimeType : undefined,
          jitter: stream.local.jitter,
          fractionLost: stream.remote?.fractionLost,
          roundTripTime: stream.remote?.roundTripTime
        }
        return rv
      })
      tStat.inStreamsPrev = new Map(streams.map((s) => [s.id, s]))
    }

    //  clear
    tStat.fractionLost = undefined
    tStat.roundTripTime = undefined
    tStat.jitter = undefined
    setAverageOf('fractionLost', tStat, streamStats)
    setAverageOf('roundTripTime', tStat, streamStats)
    setAverageOf('jitter', tStat, streamStats)

    const transports = types.get('transport')
    if (transports?.size === 1){
      const transportStat = transports.values().next().value as RTCTransportStats
      const delta = (transportStat.timestamp - tStat.timestamp)/1000
      tStat.id = transportStat.id
      tStat.timestamp = transportStat.timestamp
      if (transportStat.bytesReceived){
        tStat.receivedBytePerSec = Math.floor((transportStat.bytesReceived - tStat.bytesReceived) / delta)
        tStat.bytesReceived = transportStat.bytesReceived
      }
      if (transportStat.bytesSent){
        tStat.sentBytePerSec = Math.floor((transportStat.bytesSent - tStat.bytesSent) / delta)
        tStat.bytesSent = transportStat.bytesSent
      }
      const candidatePairId = transportStat.selectedCandidatePairId
      if (candidatePairId){
        const pair = stats.get(candidatePairId) as RTCIceCandidatePairStats
        const lc = stats.get(pair.localCandidateId) as RTCIceCandidateEx
        //  local server is client's IP address and port. Do not need to show.
        //  tStat.localServer = `${lc.address}:${lc.port}/${lc.protocol}`
        tStat.turn = lc.url
        const rc = stats.get(pair.remoteCandidateId) as RTCIceCandidateEx
        tStat.remoteServer = `${rc.address}:${rc.port}/${rc.protocol}`
      }
    }else{
      if (transports?.size && transports.size > 1){
        console.error(`${transports.size} transports in stats for ${transport}`)
      }
    }
    let quality=undefined
    if (tStat.fractionLost!==undefined || tStat.roundTripTime!==undefined || tStat.jitter !== undefined){
      const fractionLost = tStat.fractionLost ? tStat.fractionLost : 0
      const roundTripTime = tStat.roundTripTime ? tStat.roundTripTime : 0
      const jitter = (!roundTripTime && tStat.jitter) ? tStat.jitter : 0
      quality = 100 - (fractionLost>1e-10 ? Math.pow(fractionLost, -10) : 0) * 100
       - roundTripTime * 100 - jitter * 100
      quality = Math.max(Math.min(quality, 100), 0)
    }
    tStat.quality = quality
    tStat.streams = streamStats
    //console.log(`tStat: ${JSON.stringify(tStat)}`)
    const participant = tStat.dir==='send' ? participants.local : participants.getRemote(tStat.remote!)
    if (participant){
      participant.quality = tStat.quality
    }
  }).catch()
}

function setAverageOf<S,T>(prop: string, tStat:S, stats: T[]){
  const cs = tStat as any
  const ss = stats as any[]
  let count = 0
  cs[prop] = undefined
  for(const s of ss){
    if (s[prop]){
      cs[prop] = s[prop] + (cs[prop] ? cs[prop] : 0)
      count ++
    }
  }
  if (cs[prop]){
    cs[prop] /= count
  }
}
