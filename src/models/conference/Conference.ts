import {KickTime} from '@models/KickTime'
import {assert, MSTrack, Roles} from '@models/utils'
import {default as participants} from '@stores/participants/Participants'
import contents from '@stores/sharedContents/SharedContents'
import {ClientToServerOnlyMessageType, StringArrayMessageTypes} from './DataMessageType'
import {RtcConnection, updateTransportStat} from './RtcConnection'
import {DataConnection} from './DataConnection'
import * as mediasoup from 'mediasoup-client'
import { MSRemotePeer, MSTransportDirection, MSRemoteProducer} from './MediaMessages'
import { autorun } from 'mobx'
import { PriorityCalculator, trackInfoMerege, VideoAudioTrackInfo, videoAudioTrackInfoDiff } from '@models/conference/PriorityCalculator'
import { isEqualMSRP } from '@models/conference/MediaMessages'
import {connLog} from './ConferenceLog'
import { RemoteObjectInfo } from './priorityTypes'
import { inputChangeObservationStart, inputChangeObservationStop } from './observeInputDevice'

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
  transportPromise?: Promise<mediasoup.types.Transport>  // set during creating receive transport
  producers: RemoteProducer[]             // producers of the remote peer
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
  private sendTransportPromise?: Promise<mediasoup.types.Transport>
  public priorityCalculator
  //  map related
  private dataConnection_ = new DataConnection()
  public get dataConnection(){ return this.dataConnection_ }

  constructor(){
    this.rtcConnection.addListener('remoteUpdate', this.onRemoteUpdate)
    this.rtcConnection.addListener('remoteLeft', this.onRemoteLeft)

    this.priorityCalculator = new PriorityCalculator(this)
    let oldTracks: VideoAudioTrackInfo = {videos:[], audios:[]}
    autorun(()=>{
      const added = trackInfoMerege(videoAudioTrackInfoDiff(this.priorityCalculator.tracksToConsume, oldTracks))
      const removed = trackInfoMerege(videoAudioTrackInfoDiff(oldTracks, this.priorityCalculator.tracksToConsume))
      oldTracks = this.priorityCalculator.tracksToConsume
      const catchHandler = (info: RemoteObjectInfo)=>{
        //  failed to consume. Try next update.
        const aidx = oldTracks.audios.findIndex((a)=> info.id === a.id)
        if (aidx >= 0) oldTracks.audios.splice(aidx, 1)
        const vidx = oldTracks.videos.findIndex((a)=> info.id === a.id)
        if (vidx >= 0) oldTracks.videos.splice(vidx, 1)
      }
      for(const info of added){
        if(!info.producer.consumer){
          this.addConsumer(info.producer).catch(()=>{ catchHandler(info) })
        }}
      for(const info of removed){ this.removeConsumer(info.producer) }
    })
  }
  public isDataConnected(){
    return this.dataConnection.isConnected()
  }
  public isRtcConnected(){
    return this.rtcConnection.isConnected()
  }

  private updateStatInterval = 0

  public enter(room: string, reconnect:boolean = false){
    this.room_ = room
    connLog(`enter to room ${room}.`)
    if (reconnect){
      this.rtcConnection.removeListener('disconnect', this.onRtcDisconnect)
      this.dataConnection.removeListener('disconnect', this.onDataDisconnect)
    }
    this.rtcConnection.addListener('disconnect', this.onRtcDisconnect)
    this.dataConnection.addListener('disconnect', this.onDataDisconnect)

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
      const peer = participants.local.information.name.substring(0, 4).replaceAll(' ','_').replaceAll(':','_')
      this.rtcConnection.connect(room, peer).then((peer)=>{
        connLog('rtc connected.')
        //  register event handlers and join
        //  set id
        participants.setLocalId(peer)
        //  Create local tracks
        navigator.mediaDevices.enumerateDevices().then((infos)=>{
          //  Enumerate devices and set if no preference is set.
          for(const info of infos){
            const kind = info.kind
            if (kind){
              const pref = participants.local.devicePreference[kind]
              const found = infos.find(i => i.deviceId === pref)
              if (pref===undefined || found===undefined){
                participants.local.devicePreference[kind] = info.deviceId
              }
            }
          }

          //  prepare trasport for local tracks
          const mic = this.getLocalMicTrack()
          this.setLocalMicTrack(undefined).catch(()=>{})
          this.setLocalMicTrack(mic).catch(()=>{})
          const camera = this.getLocalCameraTrack()
          this.setLocalCameraTrack(undefined).catch(()=>{})
          this.setLocalCameraTrack(camera).catch(()=>{})
          const cidRtcLocals = contents.getLocalRtcContentIds()
          for(const cid of cidRtcLocals){
            const tracks = contents.getContentTracks(cid)
            const msTracks = tracks?.tracks.map((t)=>({track:t, peer:tracks.peer, role: cid}))
            msTracks?.forEach((t) => { this.addOrReplaceLocalTrack(t).catch() })
          }
          inputChangeObservationStart()

          //  connect to relay server for get contents and participants info.
          if (this.dataConnection.isConnected()){
            console.log(`DataConnection is connected.`)
            if (this.dataConnection.peer !== peer){
              this.dataConnection.disconnect().then(()=>{
                setTimeout(()=>{
                  this.dataConnection.connect(room, peer).then(()=>{
                    resolve()
                  }).catch(reject)
                }, 3000)
              })
            }else{
              this.dataConnection.sync.sendAllAboutMe(true)
              console.log('Reuse the old data connection.')
              resolve()
            }
          }else{
            this.dataConnection.connect(room, peer).then(()=>{
              resolve()
            }).catch(reject)
          }

          //  To access from debug console, add object d to the window.
          d.conference = this
        }).catch(() => { console.log('Device enumeration error') })
      }).catch(reject)
    })
    if (!this.updateStatInterval){
      this.updateStatInterval = window.setInterval(()=>{
        conference.updateTransportStat()}, 10000)
    }
    return promise
  }

  private clearRtc(){
    const rids = Array.from(this.remotePeers.values()).map(r => r.peer)
    this.onRemoteLeft([rids])
    this.remotePeers_.clear()
    this.localProducers.forEach(p => p.close())
    this.localProducers = []
    this.sendTransport_?.close()
    delete this.sendTransportPromise
    delete this.sendTransport_
  }
  private onRtcDisconnect = () => {
    console.log(`onRtcDisconnect called.`)
    //*
    inputChangeObservationStop()
    this.clearRtc()
    this.rtcConnection.leave()
    setTimeout(()=>{
      this.enter(this.room, true).then(()=>{
      })
    }, 5000)
    //  */
  }

  private onDataDisconnect = () => {
    console.log(`onDataDisconnect called.`)
    //*
    const func = ()=>{
      if (this.rtcConnection.isConnected()){
        this.dataConnection.connect(this.room, this.rtcConnection.peer)
      }else{
        setTimeout(func, 2000)
      }
    }
    setTimeout(func, 2000)
    //  */
}


  public leave(){
    const promise = new Promise<void>((resolve)=>{
      this.rtcConnection.removeListener('disconnect', this.onRtcDisconnect)
      this.rtcConnection.leave()
      this.dataConnection.removeListener('disconnect', this.onDataDisconnect)
      this.dataConnection.disconnect().then(()=>{
        this.rtcConnection.disconnect().then(()=>{
          this.clearRtc()
          this.room_ = ''
          resolve()
        })
      })
    })
    if (this.updateStatInterval) window.clearInterval(this.updateStatInterval)
    return promise
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
            this.rtcConnection.leave()
            this.rtcConnection.disconnect(3000, 'Error in setting up server-side producer')
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
              console.error('Error in setting up server-side producer. disconnect.', error)
              this.rtcConnection.leave()
              this.rtcConnection.disconnect(3000, 'Error in setting up server-side producer')
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
  public get sendTransport(){
    return this.sendTransport_
  }

  public addOrReplaceLocalTrack(track?:MSTrack, maxBitRate?:number){
    //  add content track to contents
    if (track){
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
    }
    return this.prepareSendTransport(track, maxBitRate)
  }
  public prepareSendTransport(track?:MSTrack, maxBitRate?:number){
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

  public removeLocalTrack(stopTrack: boolean, track:MSTrack){
    assert(track.peer === this.rtcConnection.peer)
    this.removeLocalTrackByRole(stopTrack, track.role, track.track.kind as mediasoup.types.MediaKind)
  }
  public removeLocalTrackByRole(stopTrack:boolean, role:Roles, kind?:mediasoup.types.MediaKind){
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
        if (stopTrack){
          producer.track?.stop()
        }
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

  public updateTransportStat(){
    if (this.sendTransport) updateTransportStat(this.sendTransport)
    this.remotePeers.forEach(r => {
      if (r.transport) updateTransportStat(r.transport)
    })
  }

  //  Commmands for local tracks --------------------------------------------
  private localMicTrack?: MSTrack
  private localCameraTrack?: MSTrack
  public setLocalMicTrack(track: MSTrack|undefined){
    const promise = new Promise<void>((resolve, reject) => {
      if (track===this.localMicTrack
         || (track?.track === this.localMicTrack?.track && track?.role === this.localMicTrack?.role)){
          resolve()
          return
      }
      //  Do not call "this.removeLocalTrack(this.localMicTrack)" here. The producer will reused.
      this.localMicTrack = track
      this.dataConnection.audioMeter.setSource(this.localMicTrack)
      if (track){
        this.addOrReplaceLocalTrack(track, 96*1024).then(()=>{resolve()}).catch(reject)
      }else{
        this.removeLocalTrackByRole(true, 'avatar', 'audio')
        resolve()
      }
    })
    return promise
  }


  private doSetLocalCameraTrack(track:MSTrack|undefined) {
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
  public setLocalCameraTrack(track?: MSTrack) {
    const promise = new Promise<MSTrack|void>((resolve, reject) => {
      if (track){
        if (track === this.localCameraTrack) {
          resolve()
        }else{
          //  this.cameraTrackConverter(track)
          //  Do not call "this.removeLocalTrack(this.localCameraTrack)" here. The producer will reused.
          this.doSetLocalCameraTrack(track).then(()=>{resolve()})
        }
      }else{
        if (this.localCameraTrack) {
          this.removeLocalTrack(true, this.localCameraTrack)
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
  private onRemoteUpdate = (arg: [MSRemotePeer[]]) => {
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
        if (!participants.remote.has(newRemote.peer)){
          participants.join(newRemote.peer)
        }
        const producers = msr.producers.map(msp => ({...msp, peer:newRemote}))
        this.remotePeers.set(msr.peer, newRemote)
        this.onProducerAdded(producers, newRemote)
      }
    }
  }
  private onRemoteLeft = (args: [string[]]) => {
    const remoteIds = args[0]
    for(const id of remoteIds){
      if (id !== this.rtcConnection.peer){
        const remote = this.remotePeers.get(id)
        if (remote) {
          this.onProducerRemoved(remote.producers, remote)
        }
        this.remotePeers.delete(id)
        if (this.rtcConnection.isConnected()){
          participants.leave(id)
        }
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
    const promise = new Promise<void>((resolve, reject) => {
      this.getConsumer(producer).then((consumer)=>{
        if (producer.role === 'avatar'){
          participants.addRemoteTrack(producer.peer.peer, consumer.track)
        }else{
          contents.addTrack(producer.peer.peer, producer.role, consumer.track)
        }
        connLog(`Conference.addConsumer(): p:${producer.id} consumed.`)
        resolve()
      }).catch((e) => {
        console.error(`Conference.addConsumer() p:${producer.id} ${e}`)
        reject(e)
      })
    })
    return promise
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
