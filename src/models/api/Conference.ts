import {KickTime} from '@models/KickTime'
import {assert, MSTrack, Roles, TrackKind} from '@models/utils'
import {default as participants} from '@stores/participants/Participants'
import contents from '@stores/sharedContents/SharedContents'
import {ClientToServerOnlyMessageType, StringArrayMessageTypes} from './DataMessageType'
import {RtcConnection} from './RtcConnection'
import {DataConnection} from './DataConnection'
import * as mediasoup from 'mediasoup-client'
import { MSRemotePeer, MSTransportDirection, MSRemoteProducer} from './MediaMessages'
import { promises } from 'dns'
import { Producer } from 'mediasoup-client/lib/Producer'

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
declare const config:any             //  from ../../config.js included from index.html
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
  producers: Map<string, RemoteProducer>  // producers of the remote peer
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
  private remotePeers = new Map<string, RemotePeer>()
  private localProducers: mediasoup.types.Producer[] = []
  private sendTransport?: mediasoup.types.Transport
  //  map related
  private dataConnection_ = new DataConnection()
  public get dataConnection(){ return this.dataConnection_ }
  constructor(){
    this.rtcConnection.addListener('remoteUpdate', this.onRemoteUpdate.bind(this))
    this.rtcConnection.addListener('remoteLeft', this.onRemoteLeft.bind(this))
  }
  public isDataConnected(){
    return this.dataConnection.isConnected()
  }
  public isRtcConnected(){
    return this.rtcConnection.isConnected()
  }

  public enter(room: string){
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
      })
    })

    //  To access from debug console, add object d to the window.
    d.conference = this
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
              console.log(`resumeConsumer finished for ${consumer!.id}.`)
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
          this.sendTransport = transport
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

  public addOrReplaceLocalTrack(track:MSTrack){
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
        return old.role === track.role && old.track.kind == track.track.kind
      })
      if (producer){
        producer.replaceTrack(track).then(()=>{
          (producer.appData as ProducerData).track = track
          resolve(producer)
        }).catch(reject)
      }else{
        this.getSendTransport().then((transport) => {
          // add track to produce
          const enc: RTCRtpEncodingParameters = {
            active: true,
            maxBitrate: 1024*128,
            scaleResolutionDownBy: 1,
          }
          transport.produce({track:track.track, appData:{track}}).then( producer => {
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
      if (track.role === role && (!kind || kind == track.track.kind)){
        producer.close()
        this.rtcConnection.closeProducer(producer.id)
        this.localProducers = this.localProducers.filter(p => p !== producer)
      }
    })
  }
/*
  public getTrack(peer: string, role: Roles, kind: mediasoup.types.MediaKind){
    const promise = new Promise<MSTrack>((resolve, reject)=>{
      const remote = this.remotePeers.get(peer)
      if (!remote) {reject(); return}
      remote.producers.forEach(p => {
        if (p.role === role && p.kind === kind){
          this.getConsumer(p).then((consumer)=>{
            const msTrack:MSTrack = {
              peer,
              track:consumer.track,
              role
            }
            resolve(msTrack)
          })
        }
      })
    })
    return promise
  }*/
  public closeTrack(peer:string, role: string, kind?: mediasoup.types.MediaKind){
    const promise = new Promise<void>((resolve, reject)=>{
      const remote = this.remotePeers.get(peer)
      if (!remote) {reject(); return}
      remote.producers.forEach(p => {
        if (p.role === role && (!kind || p.kind === kind)){
          this.getConsumer(p).then((consumer)=>{
            consumer.close()
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
                  console.log(`resumeConsumer finished for ${consumer.id}.`)
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
        this.addOrReplaceLocalTrack(track).then(()=>{resolve()}).catch(reject)
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
        this.addOrReplaceLocalTrack(this.localCameraTrack).then(resolve).catch(reject)
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
/*
  public getContentTracks(cid: string, kind?: TrackKind){
    const peer = contents.getContentTracks(cid)?.peer
    const tracks:MediaStreamTrack[] = []
    if (peer === this.dataConnection.peer){ //  local
      for (const lp of this.localProducers){
        const t = (lp.appData as ProducerData).track
        if (t.role === cid && (!kind || t.track.kind===kind)){ tracks.push(t.track) }
      }
    }else if (peer){
      const remote = this.remotePeers.get(peer)
      const rps = remote?.producers?.values()
      if (rps){
        for(const rp of rps){
          if (rp.role === cid && (!kind || rp.kind===kind) && rp.consumer?.track){
            tracks.push(rp.consumer?.track)
          }
        }
      }
    }
    return tracks
  }
*/

  //  event
  onRemoteUpdate(arg: [MSRemotePeer[]]){
    const msremotes = arg[0]
    for (const msr of msremotes){
      if (msr.peer === this.rtcConnection.peer) continue
      const remote = this.remotePeers.get(msr.peer)
      if (remote){
        const addeds:MSRemoteProducer[] = []
        const removeds = new Map(remote.producers)
        for(const msrp of msr.producers){
          const current = remote.producers.get(msrp.id)
          if (current){
            //  update exsiting producer
            if (current.id !== msrp.id){  //  producer changed and need to create new producer
              addeds.push(msrp)
            }else{                        //  no change
              removeds.delete(current.id) //  keep this producer and consumer for it
              current.role = msrp.role
              current.kind = msrp.kind
            }
          }else{
            addeds.push(msrp)
          }
        }
        removeds.forEach((removed)=>{
          remote.producers.delete(removed.id)
        })
        const addedProducers = addeds.map(added => ({...added, peer:remote}))
        for(const added of addedProducers){
          remote.producers.set(added.id, added)
        }
        this.onProducerAdded(addedProducers)
        this.onProducerRemoved(Array.from(removeds.values()))
      }else{
        const newRemote:RemotePeer = {
          peer: msr.peer,
          producers:new Map<string, RemoteProducer>()
        }
        const producers = msr.producers.map(msp => ({...msp, peer:newRemote}))
        newRemote.producers = producers.length ? new Map<string, RemoteProducer>(producers.map(p => [p.id, p]))
          : new Map<string, RemoteProducer>()
        this.remotePeers.set(msr.peer, newRemote)
        this.onProducerAdded(Array.from(newRemote.producers.values()))
      }
    }
  }
  onRemoteLeft(args: [string[]]){
    const remoteIds = args[0]
    for(const id of remoteIds){
      if (id !== this.rtcConnection.peer){
        this.remotePeers.delete(id)
        participants.leave(id)
      }
    }
  }

  onProducerAdded(producers: RemoteProducer[]){
    for(const producer of producers){
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
  }
  onProducerRemoved(producers: RemoteProducer[]){
    for(const producer of producers){
      if (producer.consumer){
        const kind = producer.consumer.kind
        producer.consumer.close()
        if (producer.role === 'avatar'){
          participants.removeRemoteTrack(producer.peer.peer, producer.kind)
        }else{
          contents.removeTrack(producer.peer.peer, producer.role, producer.kind)
        }
      }
    }
  }
}
export const conference = new Conference()
