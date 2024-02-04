import {KickTime} from '@models/KickTime'
import {assert} from '@models/utils'
import {default as participants} from '@stores/participants/Participants'
import contents from '@stores/sharedContents/SharedContents'
import {ClientToServerOnlyMessageType, StringArrayMessageTypes} from './DataMessageType'
import {MSTrack, TrackRoles, RemoteProducer, RemotePeer} from './RtcConnection'
import {RtcTransportStatsGot} from './RtcTransportStatsGot'
import {RtcTransports} from './RtcTransports'
import {DataConnection} from './DataConnection'
import * as mediasoup from 'mediasoup-client'
import { MSRemotePeer, MSRemoteProducer} from './MediaMessages'
import { autorun } from 'mobx'
import { PriorityCalculator, trackInfoMerege, VideoAudioTrackInfo, videoAudioTrackInfoDiff } from '@models/conference/PriorityCalculator'
import { isEqualMSRP } from '@models/conference/MediaMessages'
import {connLog} from '@models/utils'
import {RemoteObjectInfo } from './priorityTypes'
import {inputChangeObservationStart, inputChangeObservationStop} from './observeInputDevice'
import { PositionConnection } from './PositionConnection'
import { ISharedContent } from '@models/ISharedContent'

// config.js
declare const d:any                  //  from index.html

//  Cathegolies of BMMessage's types
const stringArrayMessageTypesForClient = new Set(StringArrayMessageTypes)
stringArrayMessageTypesForClient.add(ClientToServerOnlyMessageType.CONTENT_UPDATE_REQUEST_BY_ID)
stringArrayMessageTypesForClient.add(ClientToServerOnlyMessageType.REQUEST_PARTICIPANT_STATES)

export class Conference {
  private room_=''    //  room name
  public get room(){ return this.room_ }

  //  rtc (mediasoup) related
  private rtcTransports_ = new RtcTransports()
  public get rtcTransports(){ return this.rtcTransports_ }
  public get remotePeers(){return this.rtcTransports_.remotePeers}
  public priorityCalculator
  //  map related
  private dataConnection_ = new DataConnection()
  public get dataConnection(){ return this.dataConnection_ }
  //  position server
  private positionConnection_ = new PositionConnection()
  public get positionConnection(){ return this.positionConnection_ }

  constructor(){
    this.rtcTransports.addListener('remoteUpdate', this.onRemoteUpdate)
    this.rtcTransports.addListener('remoteLeft', this.onRemoteLeft)

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
    return this.rtcTransports.isConnected()
  }

  private updateStatInterval = 0

  public auth(room: string, reconnect:boolean = false, emali:string):Promise<string>{
    if (reconnect){
      this.rtcTransports.removeListener('disconnect', this.onRtcDisconnect)
      this.dataConnection.removeListener('disconnect', this.onDataDisconnect)
    }
    this.rtcTransports.addListener('disconnect', this.onRtcDisconnect)
    this.dataConnection.addListener('disconnect', this.onDataDisconnect)

    const promise = new Promise<string>((resolve, reject) => {
      //  connect to peer
      const peer = participants.local.information.name.substring(0, 4).replaceAll(' ','_').replaceAll(':','_')
      this.rtcTransports.auth(room, peer, emali).then((peer)=>{
        console.log("peer:" + peer)
        if(peer) {
          console.log("peer:success")
          resolve("success")
        } else {
          console.log("peer:reject")
          resolve("reject")
        }
      })
    })
    return promise
  }

  public enter(room: string, reconnect:boolean = false):Promise<string>{
    this.room_ = room
    connLog()(`enter to room ${room}.`)
    if (reconnect){
      this.rtcTransports.removeListener('disconnect', this.onRtcDisconnect)
      this.dataConnection.removeListener('disconnect', this.onDataDisconnect)
    }
    this.rtcTransports.addListener('disconnect', this.onRtcDisconnect)
    this.dataConnection.addListener('disconnect', this.onDataDisconnect)

    const promise = new Promise<string>((resolve, reject) => {
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
      this.rtcTransports.connect(room, peer).then((peer)=>{
        connLog()('rtc connected.')
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

          //  connect to data server to get contents and participants info.
          if (this.dataConnection.isConnected()){
            console.log(`DataConnection is connected.`)
            if (this.dataConnection.peer !== peer){
              this.dataConnection.disconnect().then(()=>{
                setTimeout(()=>{
                  this.dataConnection.connect(room, peer).then(()=>{
                    resolve("success")
                  }).catch(reject)
                }, 3000)
              })
            }else{
              this.dataConnection.sync.sendAllAboutMe(true)  //  send paritipant info
              console.log('Reuse the old data connection.')
              resolve("success")
            }
          }else{
            this.dataConnection.connect(room, peer).then(()=>{
              resolve("success")
            }).catch(reject)
          }

          //  Connect to local positioning system server
          if (!this.positionConnection.isConnected()){
            this.positionConnection.connect()
          }

          //  To access from debug console, add object d to the window.
          d.conference = this
        }).catch(() => { console.log('Device enumeration error') })
      }).catch(reject)
    })
    if (!this.updateStatInterval){
      this.updateStatInterval = window.setInterval(()=>{
        conference.updateAllTransportStats()}, 10000)
    }
    return promise
  }
  private clearRtc(){
    const rids = Array.from(this.remotePeers.values()).map(r => r.peer)
    this.onRemoteLeft([rids])
    this.rtcTransports.clear()
  }
  private onRtcDisconnect = () => {
    console.log(`onRtcDisconnect called.`)
    //*
    inputChangeObservationStop()
    this.clearRtc()
    this.rtcTransports.leave()
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
      if (this.rtcTransports.isConnected()){
        this.dataConnection.connect(this.room, this.rtcTransports.peer)
        setTimeout(()=>{
          this.sendLocalRtcContents()
        }, 2000)
      }else{
        setTimeout(func, 2000)
      }
    }
    setTimeout(func, 2000)
    //  */
}


  public leave(){
    const promise = new Promise<void>((resolve)=>{
      this.rtcTransports.removeListener('disconnect', this.onRtcDisconnect)
      this.rtcTransports.leave()
      this.dataConnection.removeListener('disconnect', this.onDataDisconnect)
      this.dataConnection.disconnect().then(()=>{
        this.rtcTransports.disconnect().then(()=>{
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
    return this.rtcTransports.prepareSendTransport(track, maxBitRate)
  }

  public removeLocalTrack(stopTrack: boolean, track:MSTrack){
    assert(track.peer === this.rtcTransports.peer)
    this.removeLocalTrackByRole(stopTrack, track.role, track.track.kind as mediasoup.types.MediaKind)
  }
  public removeLocalTrackByRole(stopTrack:boolean, role:TrackRoles, kind?:mediasoup.types.MediaKind){
    if (role === 'avatar'){
      if (kind === 'audio' || !kind) participants.local.tracks.audio = undefined
      if (kind === 'video' || !kind) participants.local.tracks.avatar = undefined
    }else{
      contents.removeTrack(this.rtcTransports.peer, role, kind)
    }
    this.rtcTransports.RemoveTrackByRole(stopTrack, role, kind)
  }

  public updateAllTransportStats(){
    function setQuality(tStat:RtcTransportStatsGot){
      const participant = tStat.dir==='send' ? participants.local : participants.getRemote(tStat.remote!)
      if (participant){
        participant.quality = tStat.quality
      }
    }
    this.rtcTransports.updateAllTransportStats(setQuality)
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
      if (msr.peer === this.rtcTransports.peer) continue
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
      if (id !== this.rtcTransports.peer){
        const remote = this.remotePeers.get(id)
        if (remote) {
          this.onProducerRemoved(remote.producers, remote)
        }
        this.remotePeers.delete(id)
        if (this.rtcTransports.isConnected()){
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
      this.rtcTransports.getConsumer(producer).then((consumer)=>{
        if (producer.role === 'avatar'){
          participants.addRemoteTrack(producer.peer.peer, consumer.track)
        }else{
          contents.addTrack(producer.peer.peer, producer.role, consumer.track)
        }
        connLog()(`Conference.addConsumer(): p:${producer.id} consumed.`)
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

  private sendLocalRtcContents(){
    const localRtcCids = contents.getLocalRtcContentIds()
    const localRtcContents:ISharedContent[]  = []
    for (const cid of localRtcCids){
      const c = contents.find(cid)
      if (c) localRtcContents.push(c)
    }
    //console.log(`sendLocalRtcContents called for ${participants.localId} ${JSON.stringify(localRtcContents)}`)
    this.dataConnection.sync.sendContentUpdateRequest(participants.localId, localRtcContents)
  }
}
export const conference = new Conference()
