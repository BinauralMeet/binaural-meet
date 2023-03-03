import {MSTransportDirection} from './MediaMessages'
import {RtcConnection, RemotePeer, MSTrack, RemoteProducer, TrackRoles} from './RtcConnection'
import {RtcTransportStatsGot, updateTransportStat} from './RtcTransportStatsGot'
import * as mediasoup from 'mediasoup-client'

function assert(input: any): asserts input {
  if (!input) {
    throw new Error('Not a truthy value')
  }
}

export interface ProducerData extends Record<string, unknown>{
  track: MSTrack
}
export interface ConsumerData extends Record<string, unknown>{
  producer: RemoteProducer
}

export class RtcTransports extends RtcConnection{
  private sendTransport_?: mediasoup.types.Transport
  public get sendTransport(){return this.sendTransport_}
  private sendTransportPromise?: Promise<mediasoup.types.Transport>
  private localProducers: mediasoup.types.Producer[] = []

  private remotePeers_ = new Map<string, RemotePeer>()
  public get remotePeers(){ return this.remotePeers_ }

  public clear(){
    this.remotePeers.clear()
    this.localProducers.forEach(p => p.close())
    this.localProducers = []
    this.sendTransport?.close()
    delete this.sendTransportPromise
    delete this.sendTransport_
  }

  // mediasoup
  public createTransport(dir: MSTransportDirection, remote?: RemotePeer){
    if (dir === 'receive' && !remote){
      console.error(`createTransport(); remote must be specified for receive transport.`)
    }
    const promise = new Promise<mediasoup.types.Transport>((resolve, reject)=>{
      super.createTransport(dir, remote).then(transport => {
        transport.on('connect', ({ dtlsParameters }, callback, errback) => {
          //  console.log('transport connect event', 'send');
          super.connectTransport(transport, dtlsParameters, remote?.peer).then(()=>{
            callback()
          }).catch((error:Error)=>{
            console.error(`error in connecting transport:${error.message}`);
            super.leave()
            super.disconnect(3000, 'Error in setting up server-side producer')
            errback(error)
            reject()
          })
        });
        if (dir === 'send'){
          transport.on('produce', ({ kind, rtpParameters, appData }, callback, errback) => {
            //console.log('transport produce event', rtpParameters);
            const track = (appData as ProducerData).track
            super.produceTransport({
              transport:transport.id, kind, role:track.role, rtpParameters, paused:false, appData
            }).then((id)=>{
              callback({id})
            }).catch((error)=>{
              console.error('Error in setting up server-side producer. disconnect.', error)
              super.leave()
              super.disconnect(3000, 'Error in setting up server-side producer')
              errback(error)
              reject()
            })
          })
        }
        transport.on('connectionstatechange', (state) => {
          //  console.log(`transport ${transport.id} connectionstatechange ${state}`);
          if (dir==='receive' && state === 'connected'){
            assert(remote)
            const consumers = Array.from(remote.producers.values()).map(p => p.consumer).filter(c => c)
            for(const consumer of consumers){
              this.resumeConsumer(consumer!.id, remote.peer)
              //console.log(`resumeConsumer finished for ${consumer!.id}.`)
              consumer!.resume()
            }
          }
          if (state === 'closed' || state === 'failed' || state === 'disconnected') {
            //  console.log('transport closed ... leaving the room and resetting');
            //TODO: leaveRoom();
          }
        });
        resolve(transport)
      }).catch(reject)
    })
    return promise
  }

  private getSendTransport(){
    if (this.sendTransportPromise){ return this.sendTransportPromise }
    const promise = new Promise<mediasoup.types.Transport>((resolve, reject)=>{
      if (this.sendTransport){
        delete this.sendTransportPromise
        resolve(this.sendTransport)
      }else{
        this.createTransport('send').then(transport=>{
          this.sendTransport_ = transport
          delete this.sendTransportPromise
          resolve(transport)
        }).catch(reject)
      }
    })
    this.sendTransportPromise = promise //  Start to create transport
    return promise
  }
  private getReceiveTransport(peer: RemotePeer){
    if (peer.transportPromise){ return peer.transportPromise }
    const promise = new Promise<mediasoup.types.Transport>((resolve, reject)=>{
      if (peer.transport){
        delete peer.transportPromise
        resolve(peer.transport)
      }else{
        this.createTransport('receive', peer).then(transport => {
          peer.transport = transport
          delete peer.transportPromise
          resolve(peer.transport)
        }).catch(reject)
      }
    })
    peer.transportPromise = promise //  Start to create transport
    return promise
  }

  public prepareSendTransport(track?:MSTrack, maxBitRate?:number, codec?:mediasoup.types.RtpCodecCapability){
    const promise = new Promise<mediasoup.types.Producer>((resolve, reject)=>{
      if (!track){
        reject('track not specified')
      }else{
        //  find old or create a producer
        const oldProducer = this.localProducers.find(p => {
          const old = (p.appData as ProducerData).track
          return old.role === track.role && old.track.kind === track.track.kind
        })
        if (oldProducer){
          oldProducer.replaceTrack(track).then(()=>{
            (oldProducer.appData as ProducerData).track = track
            oldProducer.resume()
            resolve(oldProducer)
          }).catch(reject)
        }else{
          this.getSendTransport().then((transport) => {
            // add track to produce
            let codecOptions=undefined
            if (track.track.kind === 'audio'){
              //console.log(`getSendTransport audio settings:`,track.track.getSettings())
              const settings = track.track.getSettings() as any
              codecOptions =
              {
                opusStereo: !(settings.channelCount===1),
                opusDtx: true
              }
              //console.log('codec options:', codecOptions)
            }

            transport.produce({
              track:track.track,
              stopTracks:false,
              encodings:maxBitRate ? [{maxBitrate:maxBitRate}] : undefined,
              appData:{track},
              codecOptions,
              codec
            }).then( producer => {
              this.localProducers.push(producer)
              resolve(producer)
            }).catch(reject)
          })
        }
      }
    })
    return promise
  }
  public RemoveTrackByRole(stopTrack:boolean, role:TrackRoles, kind?:mediasoup.types.MediaKind){
    this.localProducers.forEach((producer)=>{
      const track = (producer.appData as ProducerData).track
      if (track.role === role && (!kind || kind === track.track.kind)){
        producer.close()
        if (stopTrack){
          producer.track?.stop()
        }
        this.closeProducer(producer.id)
        this.localProducers = this.localProducers.filter(p => p !== producer)
      }
    })
  }

  public closeTrack(peer:string, role: string, kind?: mediasoup.types.MediaKind){
    const promise = new Promise<void>((resolve, reject)=>{
      const remote = this.remotePeers.get(peer)
      if (!remote) {reject(); return}
      let counter = 0
      remote.producers.forEach(p => {
        if (p.role === role && (!kind || p.kind === kind)){
          counter ++
          this.getConsumer(p).then((consumer)=>{
            consumer.close()
            counter --
            if (counter === 0) resolve()
          })
        }
      })
    })
    return promise
  }

  public getConsumer(producer: RemoteProducer){
    const promise = new Promise<mediasoup.types.Consumer>((resolve, reject)=>{
      if (producer.consumer){
        resolve(producer.consumer)
      }else{
        this.getReceiveTransport(producer.peer).then(transport => {
          this.consumeTransport(transport.id, producer).then(consumeParams=>{
            transport.consume(consumeParams).then(consumer => {
              producer.consumer = consumer
              if (transport.connectionState === 'connected'){
                this.resumeConsumer(consumer.id, producer.peer.peer).then(()=>{
                  //console.log(`resumeConsumer finished for ${consumer.id}.`)
                })
              }
              resolve(consumer)
            }).catch(reject)
          }).catch(reject)
        }).catch(reject)
      }
    })
    return promise
  }
  public updateAllTransportStats(setQuality: (tStat:RtcTransportStatsGot)=>void){
    if (this.sendTransport) updateTransportStat(this.sendTransport).then(setQuality)
    this.remotePeers.forEach(r => {
      if (r.transport) updateTransportStat(r.transport).then(setQuality)
    })
  }
}
