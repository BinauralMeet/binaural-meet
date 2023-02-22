import * as mediasoup from 'mediasoup-client';
import { makeObservable, observable } from 'mobx';
import {MSTransportDirection} from './MediaMessages'

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
export class RtcTransportStatsGot{
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
  outStreamsPrev = new Map<string, RtcOutStreamStat>()
  inStreamsPrev = new Map<string, RtcInStreamStat>()
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

export interface RtcOutStreamStat{
  id: string
  local: RTCOutboundRtpStreamStatsEx
  remote?: RTCRemoteInboundRtpStreamStats
}
export interface RtcInStreamStat{
  id: string
  local: RTCInboundRtpStreamStatsEx
  remote?: RTCRemoteOutboundRtpStreamStats
}

export function getStatFromTransport(transport?: mediasoup.types.Transport){
  return transport?.appData.stat as RtcTransportStatsGot|undefined
}

export function updateTransportStat(transport: mediasoup.types.Transport){
  const promise = new Promise<RtcTransportStatsGot>((resolve, reject)=>{
    const tStat = transport.appData.stat as RtcTransportStatsGot
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
      resolve(tStat)
      //console.log(`tStat: ${JSON.stringify(tStat)}`)
    }).catch(e=>{
      reject(e)
    })
  })
  return promise
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
