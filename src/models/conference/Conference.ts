import {KickTime} from '@models/KickTime'
import {assert, MSTrack, Roles} from '@models/utils'
import {default as participants} from '@stores/participants/Participants'
import contents from '@stores/sharedContents/SharedContents'
import {ClientToServerOnlyMessageType, StringArrayMessageTypes} from './DataMessageType'
import {RtcConnection, TransportStat} from './RtcConnection'
import {DataConnection} from './DataConnection'
import * as mediasoup from 'mediasoup-client'
import { MSRemotePeer, MSTransportDirection, MSRemoteProducer} from './MediaMessages'
import { autorun } from 'mobx'
import { PriorityCalculator, trackInfoMerege, VideoAudioTrackInfo, videoAudioTrackInfoDiff } from '@models/conference/PriorityCalculator'
import { isEqualMSRP } from '@models/conference/MediaMessages'

//  Log level and module log options
export const CONNECTIONLOG = false
export const TRACKLOG = false        // show add, remove... of tracks
export const EVENTLOG = false
export const SENDLOG = false
export const trackLog = TRACKLOG ? console.log : (a:any) => {}
export const connLog = CONNECTIONLOG ? console.log : (a:any) => {}
export const connDebug = CONNECTIONLOG ? console.debug : (a:any) => {}
export const eventLog = EVENTLOG ? console.log : (a:any) => {}
export const sendLog = SENDLOG ? console.log : (a:any) => {}

// config.js
declare const d:any                  //  from index.html

//  Cathegolies of BMMessage's types
const stringArrayMessageTypesForClient = new Set(StringArrayMessageTypes)
stringArrayMessageTypesForClient.add(ClientToServerOnlyMessageType.CONTENT_UPDATE_REQUEST_BY_ID)
stringArrayMessageTypesForClient.add(ClientToServerOnlyMessageType.REQUEST_PARTICIPANT_STATES)

export interface RemoteProducer extends MSRemoteProducer{
  peer: RemotePeer                    //  remote peer
  consumer?: mediasoup.types.Consumer //  consumer for the remote producer
}
export interface RemotePeer{
  peer: string
  transport?: mediasoup.types.Transport   // receive transport
  producers: RemoteProducer[]             // producers of the remote peer
}
export function getStatFromRemotePeer(r?: RemotePeer){
  return r?.transport?.appData.stat as TransportStat
}

export interface LocalProducer{
  id: string
  role: string | Roles
  producer: mediasoup.types.Producer
}
export interface ProducerData extends Record<string, unknown>{
  track: MSTrack
}
export interface ConsumerData extends Record<string, unknown>{
  producer: RemoteProducer
}

export class Conference {
  private room_=''    //  room name
  public get room(){ return this.room_ }

  //  rtc (mediasoup) related
  private rtcConnection_ = new RtcConnection()
  public get rtcConnection(){ return this.rtcConnection_ }
  private remotePeers_ = new Map<string, RemotePeer>()
  public get remotePeers(){return this.remotePeers_}
  private localProducers: mediasoup.types.Producer[] = []
  private sendTransport_?: mediasoup.types.Transport
  public priorityCalculator
  //  map related
  private dataConnection_ = new DataConnection()
  public get dataConnection(){ return this.dataConnection_ }

  constructor(){
    this.rtcConnection.addListener('remoteUpdate', this.onRemoteUpdate.bind(this))
    this.rtcConnection.addListener('remoteLeft', this.onRemoteLeft.bind(this))
    this.priorityCalculator = new PriorityCalculator(this)
    let oldTracks: VideoAudioTrackInfo = {videos:[], audios:[]}
    autorun(()=>{
      const added = trackInfoMerege(videoAudioTrackInfoDiff(this.priorityCalculator.tracksToConsume, oldTracks))
      const removed = trackInfoMerege(videoAudioTrackInfoDiff(oldTracks, this.priorityCalculator.tracksToConsume))
      for(const info of added){ if(!info.producer.consumer) this.addConsumer(info.producer) }
      for(const info of removed){ this.removeConsumer(info.producer) }
      oldTracks = this.priorityCalculator.tracksToConsume
    })
  }
  public isDataConnected(){
    return this.dataConnection.isConnected()
  }
  public isRtcConnected(){
    return this.rtcConnection.isConnected()
  }

  public enter(room: string){
    const promise = new Promise<void>((resolve, reject) => {
      //  check last kicked time and stop the operation if recently kicked.
      const str = window.localStorage.getItem('kickTimes')
      if (str){
        const kickTimes = JSON.parse(str) as KickTime[]
        const found = kickTimes.find(kt => kt.room === this.room)
        if (found){
          const diff = Date.now() - found.time
          const KICK_WAIT_MIN = 15  //  Can not login KICK_WAIT_MIN minutes once kicked.
          if (diff < KICK_WAIT_MIN * 60 * 1000){
            window.location.reload()
            reject('kicked')
            return
          }
        }
      }

      //  connect to peer
      const peer = participants.local.information.name.substring(0, 4)
      this.rtcConnection.connect(room, peer).then((peer)=>{
        //  register event handlers and join
        //  set id
        participants.setLocalId(peer)
        //  create tracks
        for (const prop in participants.local.devicePreference) {
          if (participants.local.devicePreference[prop] === undefined) {
            participants.local.devicePreference[prop] = ''
          }
        }
        //  connect to relay server for get contents and participants info.
        this.dataConnection.connect(room, peer).then(()=>{
          this.dataConnection.sync.sendAllAboutMe(true)
          resolve()
        }).catch(reject)
      }).catch(reject)
    })

    //  To access from debug console, add object d to the window.
    d.conference = this

    return promise
  }

  public leave(){
    this.dataConnection.disconnect()
    this.rtcConnection.disconnect()
    this.room_ = ''
  }

  // mediasoup
  private createTransport(dir: MSTransportDirection, remote?: RemotePeer){
    if (dir === 'receive' && !remote){
      console.error(`createTransport(); remote must be specified for receive transport.`)
    }
    const promise = new Promise<mediasoup.types.Transport>((resolve, reject)=>{
      this.rtcConnection.createTransport(dir, remote?.peer).then(transport => {
        transport.on('connect', ({ dtlsParameters }, callback, errback) => {
          //  console.log('transport connect event', 'send');
          this.rtcConnection.connectTransport(transport, dtlsParameters, remote?.peer).then(()=>{
            callback()
          }).catch((error:string)=>{
            console.error(`error in connecting transport:${error}`);
            errback()
            reject()
          })
        });
        if (dir === 'send'){
          transport.on('produce', ({ kind, rtpParameters, appData }, callback, errback) => {
            //  console.log('transport produce event', appData);
            const track = (appData as ProducerData).track
            this.rtcConnection.produceTransport({
              transport:transport.id, kind, role:track.role, rtpParameters, paused:false, appData
            }).then((id)=>{
              callback({id})
            }).catch((error)=>{
              console.error('error setting up server-side producer', error)
              errback()
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
              this.rtcConnection.resumeConsumer(consumer!.id, remote.peer)
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
    const promise = new Promise<mediasoup.types.Transport>((resolve, reject)=>{
      if (this.sendTransport){
        resolve(this.sendTransport)
      }else{
        this.createTransport('send').then(transport=>{
          this.sendTransport_ = transport
          resolve(transport)
        }).catch(reject)
      }
    })
    return promise
  }
  private getReceiveTransport(peer: RemotePeer){
    const promise = new Promise<mediasoup.types.Transport>((resolve, reject)=>{
      if (peer.transport){
        resolve(peer.transport)
      }else{
        this.createTransport('receive', peer).then(transport => {
          peer.transport = transport
          resolve(transport)
        }).catch(reject)
      }
    })
    return promise
  }
  public get sendTransport(){
    return this.sendTransport_
  }
  public get sendTransportStat(){
    return this.sendTransport_?.appData.stat as TransportStat
  }

  public addOrReplaceLocalTrack(track:MSTrack, maxBitRate?:number){
    const promise = new Promise<mediasoup.types.Producer>((resolve, reject)=>{
      //  add content track to contents
      if (track.role === 'avatar'){
        if (track.track.kind === 'audio'){
          participants.local.tracks.audio = track.track
        }else{
          participants.local.tracks.avatar = track.track
        }
      }else{
        contents.addTrack(track.peer, track.role, track.track)
        if (track.track.kind === 'video'){
          track.track.addEventListener('ended', ()=>{
            contents.removeByLocal(track.role)
          })
        }
      }
      //  create producer
      const producer = this.localProducers.find(p => {
        const old = (p.appData as ProducerData).track
        return old.role === track.role && old.track.kind === track.track.kind
      })
      if (producer){
        producer.replaceTrack(track).then(()=>{
          (producer.appData as ProducerData).track = track
          resolve(producer)
        }).catch(reject)
      }else{
        this.getSendTransport().then((transport) => {
          // add track to produce
          transport.produce({
            track:track.track,
            encodings:maxBitRate ? [{maxBitrate:maxBitRate}] : undefined,
            appData:{track}
          }).then( producer => {
            this.localProducers.push(producer)
            resolve(producer)
          })
        })
      }
    })
    return promise
  }
  public removeLocalTrack(track:MSTrack){
    assert(track.peer === this.rtcConnection.peer)
    this.removeLocalTrackByRole(track.role, track.track.kind as mediasoup.types.MediaKind)
  }
  public removeLocalTrackByRole(role:Roles, kind?:mediasoup.types.MediaKind){
    if (role === 'avatar'){
      if (kind === 'audio' || !kind) participants.local.tracks.audio = undefined
      if (kind === 'video' || !kind) participants.local.tracks.avatar = undefined
    }else{
      contents.removeTrack(this.rtcConnection.peer, role, kind)
    }
    this.localProducers.forEach((producer)=>{
      const track = (producer.appData as ProducerData).track
      if (track.role === role && (!kind || kind === track.track.kind)){
        producer.close()
        this.rtcConnection.closeProducer(producer.id)
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

  private getConsumer(producer: RemoteProducer){
    const promise = new Promise<mediasoup.types.Consumer>((resolve, reject)=>{
      if (producer.consumer){
        resolve(producer.consumer)
      }else{
        this.getReceiveTransport(producer.peer).then(transport => {
          this.rtcConnection.consumeTransport(transport.id, producer).then(consumeParams=>{
            transport.consume(consumeParams).then(consumer => {
              producer.consumer = consumer
              if (transport.connectionState === 'connected'){
                this.rtcConnection.resumeConsumer(consumer.id, producer.peer.peer).then(()=>{
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

  //  Commmands for local tracks --------------------------------------------
  private localMicTrack?: MSTrack
  private localCameraTrack?: MSTrack
  public setLocalMicTrack(track?: MSTrack){
    const promise = new Promise<void>((resolve, reject) => {
      if (track === this.localMicTrack){ resolve(); return}
      //  remove old
      if (this.localMicTrack) {
        this.removeLocalTrack(this.localMicTrack)
      }
      //  add new
      this.localMicTrack = track
      this.dataConnection.audioMeter.setSource(this.localMicTrack)
      if (track){
        this.addOrReplaceLocalTrack(track, 96*1024).then(()=>{resolve()}).catch(reject)
      }else{
        resolve()
      }
    })
    return promise
  }


  private doSetLocalCameraTrack(track?:MSTrack) {
    const promise = new Promise<mediasoup.types.Producer|void>((resolve, reject) => {
      this.localCameraTrack = track
      if (this.localCameraTrack){
        this.addOrReplaceLocalTrack(this.localCameraTrack, 128*1024).then(resolve).catch(reject)
      }else{
        resolve()
      }
    })
    return promise
  }
  public setLocalCameraTrack(track: MSTrack|undefined) {
    const promise = new Promise<MSTrack|void>((resolve, reject) => {
      if (track){
        if (track === this.localCameraTrack) {
          resolve()
        }else{
          //  this.cameraTrackConverter(track)
          if (this.localCameraTrack) {
            this.removeLocalTrack(this.localCameraTrack)
          }
          this.doSetLocalCameraTrack(track).then(()=>{resolve()})
        }
      }else{
        if (this.localCameraTrack) {
          this.removeLocalTrack(this.localCameraTrack)
          this.doSetLocalCameraTrack(track).then(()=>{resolve()})
        }else {
          resolve()
        }
      }
    })

    return promise
  }
  public getLocalMicTrack() {
    return this.localMicTrack
  }
  public getLocalCameraTrack() {
    return this.localCameraTrack
  }

  //  event
  private onRemoteUpdate(arg: [MSRemotePeer[]]){
    const msremotes = arg[0]
    for (const msr of msremotes){
      if (msr.peer === this.rtcConnection.peer) continue
      const remote = this.remotePeers.get(msr.peer)
      if (remote){
        const addeds:MSRemoteProducer[] = []
        const removeds = remote.producers.filter(p => !msr.producers.find(m => isEqualMSRP(p, m)))
        for(const msrp of msr.producers){
          const current = remote.producers.find(p => isEqualMSRP(p, msrp))
          if (current){
            //  update exsiting producer
            if (current.id !== msrp.id){  //  producer changed and need to create new producer
              addeds.push(msrp)
              removeds.push(current)
            }
          }else{
            addeds.push(msrp)
          }
        }
        const addedProducers = addeds.map(added => ({...added, peer:remote}))
        if (removeds.length) this.onProducerRemoved(removeds, remote)
        if (addedProducers.length) this.onProducerAdded(addedProducers, remote)
      }else{
        const newRemote:RemotePeer = {
          peer: msr.peer,
          producers:[]
        }
        const producers = msr.producers.map(msp => ({...msp, peer:newRemote}))
        this.remotePeers.set(msr.peer, newRemote)
        this.onProducerAdded(producers, newRemote)
      }
    }
  }
  private onRemoteLeft(args: [string[]]){
    const remoteIds = args[0]
    for(const id of remoteIds){
      if (id !== this.rtcConnection.peer){
        const remote = this.remotePeers.get(id)
        if (remote) {
          this.onProducerRemoved(remote.producers, remote)
        }
        this.remotePeers.delete(id)
        participants.leave(id)
      }
    }
  }
  private onProducerAdded(producers: RemoteProducer[], remote: RemotePeer){
    const ps = [...producers]
    remote.producers.push(...ps)
    for(const producer of ps){
      this.priorityCalculator.onAddProducer(producer)
    }
  }
  private onProducerRemoved(producers: RemoteProducer[], remote: RemotePeer){
    const removes = [...producers]
    remote.producers = remote.producers.filter(p => removes.find(r => !isEqualMSRP(p, r)))
    for(const producer of producers){
      this.removeConsumer(producer)
      this.priorityCalculator.onRemoveProducer(producer)
    }
  }
  private addConsumer(producer: RemoteProducer){
    this.getConsumer(producer).then((consumer)=>{
      if (producer.role === 'avatar'){
        participants.addRemoteTrack(producer.peer.peer, consumer.track)
      }else{
        contents.addTrack(producer.peer.peer, producer.role, consumer.track)
      }
    }).catch((e) => {
      console.error(`conference.onProducerAdded(): ${e}`)
    })
  }
  private removeConsumer(producer: RemoteProducer){
    if (producer.consumer){
      producer.consumer.close()
      producer.consumer = undefined
      if (producer.role === 'avatar'){
        participants.removeRemoteTrack(producer.peer.peer, producer.kind)
      }else{
        contents.removeTrack(producer.peer.peer, producer.role, producer.kind)
      }
    }
  }

}
export const conference = new Conference()
