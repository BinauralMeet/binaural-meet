import {EventEmitter} from 'events'
import {RemoteProducer} from './Conference'
import {MSCreateTransportMessage, MSMessage, MSPeerMessage, MSMessageType, MSRoomMessage, MSRTPCapabilitiesReply,
  MSTransportDirection, MSCreateTransportReply, MSConnectTransportMessage, MSConnectTransportReply,
  MSProduceTransportMessage, MSProduceTransportReply, MSTrackRole, MSConsumeTransportMessage, MSConsumeTransportReply, MSRemoteUpdateMessage, MSRemoteLeftMessage, MSResumeConsumerMessage, MSResumeConsumerReply, MSCloseProducerMessage, MSCloseProducerReply} from './MediaMessages'
import * as mediasoup from 'mediasoup-client';
import { observable } from 'mobx';
import participants from '@stores/participants/Participants';

// config.js
declare const config:any                  //  from ../../config.js included from index.html

//  Log level and module log options
export const RTC_CON_LOG = false
export const rtcLog = RTC_CON_LOG ? console.log : (a:any) => {}

type RtcConnectionEvent = 'remoteUpdate' | 'remoteLeft' | 'connect' | 'disconnect'

export class RtcConnection{
  private peer_=''
  private connected = false
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
    return this.connected && this.mainServer?.readyState === WebSocket.OPEN
  }

  //  connect to main server. return my peer id got.
  public connect(room: string, peer: string){
    rtcLog(`rtcConn connect(${room}, ${peer})`)
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
        rtcLog('onClose() for mainServer')
        this.connected = false
        this.emit('disconnect')

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
  public leave(){
    const msg:MSMessage = {
      type:'leave'
    }
    this.mainServer?.send(JSON.stringify(msg))
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
    rtcLog(`onConnect( ${JSON.stringify(base)}`)
    const msg = base as MSPeerMessage
    this.peer_ = msg.peer
    const room = this.getMessageArg(msg) as string
    if (this.mainServer){
      const roomMsg:MSRoomMessage = {
        type: 'join',
        peer:msg.peer,
        room
      }
      rtcLog(`join sent ${JSON.stringify(roomMsg)}`)
      this.mainServer.send(JSON.stringify(roomMsg))
      this.loadDevice(msg.peer).then(()=>{
        this.resolveMessage(msg, msg.peer)
        this.connected = true
        this.emitter.emit('connect')
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
      startUpdateTransportStat(transportObject, msg.dir, remote)
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
export interface TransportStat{
  dir:MSTransportDirection
  fractionLost?:number
  roundTripTime?:number
  jitter?:number
  timestamp:number
  receivedBytePerSec?:number
  sentBytePerSec?:number
  bytesSent:number
  bytesReceived:number
  turn?: string
  localServer?: string
  remoteServer?: string
  streams: StreamStat[]
  quality?: number  //  0 - 100, 100 is best
}
interface RTCOutboundRtpStreamStatsEx extends RTCOutboundRtpStreamStats{
  targetBitrate?: number
}
interface RTCInboundRtpStreamStatsEx extends RTCInboundRtpStreamStats{
  bytesReceived: number

}
export const defaultTransportStat:TransportStat={
  timestamp:0,
  bytesSent:0,
  bytesReceived:0,
  streams:[],
  dir: 'send',
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
export interface StreamStat{
  dir: MSTransportDirection
  bytesPerSec?:number
  codec?: string
  targetBitrate?: number
  fractionLost?: number
  roundTripTime?: number
  jitter?: number
  id: string
}

export function stopTransportStatUpdate(transport: mediasoup.types.Transport){
  if (transport.appData.interval) window.clearInterval(transport.appData.interval as number)
  delete transport.appData.interval
}
export function startUpdateTransportStat(transport: mediasoup.types.Transport, dir: MSTransportDirection, remote?: string){
  //  add stat and listener to transport
  if (!transport.appData.stat){
    const tStat:TransportStat = {...defaultTransportStat, dir}
    transport.appData.stat = observable(tStat)
    transport.observer.addListener('close', ()=>{
      stopTransportStatUpdate(transport)
    })
  }

  //  set interval timer
  let outStreamsPrev = new Map<string, RTCOutStreamStat>()
  let inStreamsPrev = new Map<string, RTCInStreamStat>()
  transport.appData.interval = window.setInterval(()=>{
    const curStat = transport.appData.stat as TransportStat
    transport?.getStats().then((stats)=>{
      const keys = Array.from(stats.keys())

      /*
      //  log all stats
      let str=''
      keys.forEach((key)=>{ str = `${str}\n ${key}:${JSON.stringify(stats.get(key))}` })
      console.log(str)
      //  */
      let streamStats:StreamStat[]
      if (dir === 'send'){
        const streamIds = keys.filter(k => k.includes('RTCOutboundRTPVideoStream') || k.includes('RTCOutboundRTPAudioStream'))
          .map(k => k.substring('RTCOutboundRTP'.length))
        const streams = streamIds.map(id => ({
          id,
          local: stats.get(`RTCOutboundRTP${id}`) as RTCOutboundRtpStreamStatsEx,
          remote: stats.get(`RTCRemoteInboundRtp${id}`) as RTCRemoteInboundRtpStreamStats|undefined,
        }))
        streamStats = streams.map(stream => {
          const prev = outStreamsPrev.get(stream.id)
          const dt = prev?.local?.timestamp ? (stream.local.timestamp - prev.local.timestamp)/1000 : 0

          if (stream.local.codecId){
            stats.get(stream.local.codecId)
          }
          const rv:StreamStat = {
            dir,
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
        outStreamsPrev = new Map(streams.map((s) => [s.id, s]))
      }else{
        const streamIds = keys.filter(k => k.includes('RTCInboundRTPVideoStream') || k.includes('RTCInboundRTPAudioStream'))
          .map(k => k.substring('RTCInboundRTP'.length))
        const streams = streamIds.map(id => ({
          id,
          local: stats.get(`RTCInboundRTP${id}`) as RTCInboundRtpStreamStatsEx,
          remote: stats.get(`RTCRemoteOutboundRTP${id}`) as RTCRemoteOutboundRtpStreamStats,
        }))
        //  console.log(JSON.stringify(streams))
        streamStats = streams.map(stream => {
          const prev = inStreamsPrev.get(stream.id)
          const dt = prev?.local?.timestamp ? (stream.local.timestamp - prev.local.timestamp)/1000 : 0

          if (stream.local.codecId){
            stats.get(stream.local.codecId)
          }
          const rv:StreamStat = {
            dir,
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
        inStreamsPrev = new Map(streams.map((s) => [s.id, s]))
      }
      //  clear
      curStat.fractionLost = undefined
      curStat.roundTripTime = undefined
      curStat.jitter = undefined
      setAverageOf('fractionLost', curStat, streamStats)
      setAverageOf('roundTripTime', curStat, streamStats)
      setAverageOf('jitter', curStat, streamStats)

      const tkey = keys.find(k => k.substring(0, 'RTCTransport'.length) === 'RTCTransport')
      if (tkey){
        const tStat = stats.get(tkey) as RTCTransportStats
        const delta = (tStat.timestamp - curStat.timestamp)/1000
        curStat.timestamp = tStat.timestamp
        if (tStat.bytesReceived){
          curStat.receivedBytePerSec = Math.floor((tStat.bytesReceived - curStat.bytesReceived) / delta)
          curStat.bytesReceived = tStat.bytesReceived
        }
        if (tStat.bytesSent){
          curStat.sentBytePerSec = Math.floor((tStat.bytesSent - curStat.bytesSent) / delta)
          curStat.bytesSent = tStat.bytesSent
        }
        const ckey = tStat.selectedCandidatePairId
        if (ckey){
          const pair = stats.get(ckey) as RTCIceCandidatePairStats
          const lc = stats.get(pair.localCandidateId) as RTCIceCandidateEx
          //  local server is client's IP address and port. Do not need to show.
          //  curStat.localServer = `${lc.address}:${lc.port}/${lc.protocol}`
          curStat.turn = lc.url
          const rc = stats.get(pair.remoteCandidateId) as RTCIceCandidateEx
          curStat.remoteServer = `${rc.address}:${rc.port}/${rc.protocol}`
        }
      }
      let quality=undefined
      if (curStat.fractionLost!==undefined || curStat.roundTripTime!==undefined || curStat.jitter !== undefined){
        const fractionLost = curStat.fractionLost ? curStat.fractionLost : 0
        const roundTripTime = curStat.roundTripTime ? curStat.roundTripTime : 0
        const jitter = (!roundTripTime && curStat.jitter) ? curStat.jitter : 0
        quality = 100 - (fractionLost>1e-10 ? Math.pow(fractionLost, -10) : 0) * 100
         - roundTripTime * 100 - jitter * 100
        quality = Math.max(Math.min(quality, 100), 0)
      }
      curStat.quality = quality
      curStat.streams = streamStats
      //console.log(`curStat: ${JSON.stringify(curStat)}`)
      const participant = dir==='send' ? participants.local : participants.getRemote(remote!)
      if (participant){
        participant.quality = curStat.quality
      }
    }).catch()
  }, 5000)
}

function setAverageOf<S,T>(prop: string, curStat:S, stats: T[]){
  const cs = curStat as any
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
