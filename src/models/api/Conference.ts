import { MAP_SIZE } from '@components/Constants'
import {recorder} from '@models/api/Recorder'
import {KickTime} from '@models/KickTime'
import {assert, MSTrack, Roles} from '@models/utils'
import map from '@stores/Map'
import {default as participants} from '@stores/participants/Participants'
import roomInfo from '@stores/RoomInfo'
import contents from '@stores/sharedContents/SharedContents'
import {EventEmitter} from 'events'
import {BMMessage} from './BMMessage'
import {ConferenceSync} from './ConferenceSync'
import {ClientToServerOnlyMessageType, MessageType, ObjectArrayMessageTypes, StringArrayMessageTypes} from './MessageType'
import {Connection} from './Connection'
import * as mediasoup from 'mediasoup-client'
import { MSRemotePeer, MSTransportDirection, MSRemoteProducer} from './MediaMessages'
import { Producer } from 'mediasoup-client/lib/Producer'

//  Log level and module log options
export const JITSILOGLEVEL = 'warn'  // log level for lib-jitsi-meet {debug|log|warn|error}
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

export const ConferenceEvents = {
  USER_JOINED: 'joined',
  USER_LEFT: 'left',
  REMOTE_TRACK_ADDED: 'remote_track_added',
  REMOTE_TRACK_REMOVED: 'remote_track_removed',
}

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

export class Conference extends EventEmitter {
  public name=''    //  room name
  public peer=''   //  peerId
  sync = new ConferenceSync(this)
  //  relay server related
  bmRelaySocket:WebSocket|undefined = undefined //  Socket for message passing via separate relay server
  private lastRequestTime = Date.now()
  private lastReceivedTime = Date.now()
  private messagesToSendToRelay: BMMessage[] = []
  relayRttLast = 50
  relayRttAverage = 50

  //  mediasoup related
  private connection: Connection
  private remotePeers = new Map<string, RemotePeer>()
  private localProducers: mediasoup.types.Producer[] = []
  private sendTransport?: mediasoup.types.Transport

  constructor(c: Connection){
    super()
    this.connection = c
  }

  setRoomProp(name:string, value:string){
    //  console.log(`setRoomProp(${name}, ${value})`)
    this.pushOrUpdateMessageViaRelay(MessageType.ROOM_PROP, [name, value])
    roomInfo.onUpdateProp(name, value)
  }

  public init(){
    //  check last kicked time and stop the operation if recently kicked.
    const str = window.localStorage.getItem('kickTimes')
    if (str){
      const kickTimes = JSON.parse(str) as KickTime[]
      const found = kickTimes.find(kt => kt.room === this.name)
      if (found){
        const diff = Date.now() - found.time
        const KICK_WAIT_MIN = 15  //  Can not login KICK_WAIT_MIN minutes once kicked.
        if (diff < KICK_WAIT_MIN * 60 * 1000){
          window.location.reload()

          return
        }
      }
    }

    //  register event handlers and join
    this.sync.bind()
    //  set id
    participants.setLocalId(this.peer)
    this.sync.observeStart()
    //  create tracks
    for (const prop in participants.local.devicePreference) {
      if (participants.local.devicePreference[prop] === undefined) {
        participants.local.devicePreference[prop] = ''
      }
    }

    //  connect to relay server for get contents and participants info.
    if (config.bmRelayServer){
      this.connectToRelayServer()
    }
    //  start periodical communication with relay server.
    this.step()

    //  To access from debug console, add object d to the window.
    d.conference = this
    d.showState = () => {
      console.log(`carrierMap: ${JSON.stringify(contents.tracks.carrierMap)}`)
      console.log(`contentCarriers: ${JSON.stringify(contents.tracks.contentCarriers)}`)
      console.log(`remoteMains: ${JSON.stringify(contents.tracks.remoteMains.keys())}`)
    }
  }

  public uninit(){
    if (config.bmRelayServer && this.peer){
      this.pushOrUpdateMessageViaRelay(MessageType.PARTICIPANT_LEFT, [this.peer])
      this.sendMessageViaRelay()
    }
    /*TODO: uninit tracks
    if (participants.local.tracks.audio) {
      this.removeTrack(participants.local.tracks.audio)?.then(()=>{
        participants.local.tracks.audio?.dispose()
      })
    }
    if (participants.local.tracks.avatar) {
      this.removeTrack(participants.local.tracks.avatar)?.then(()=>{
        participants.local.tracks.avatar?.dispose()
      })
    }
    */
    this.sync.observeEnd()
    //  stop relayServer communication.
    this.stopStep = true

    return new Promise((resolve, reject) => {
      //TODO: leave from room
    })
  }

  private stopStep = false
  private step(){
    const period = 50
    if (this.bmRelaySocket?.readyState === WebSocket.OPEN){
      const timeToProcess = period * 0.8
      const deadline = Date.now() + timeToProcess
      while(Date.now() < deadline && this.receivedMessages.length){
        const msg = this.receivedMessages.shift()
        if (msg){
          this.sync.onBmMessage([msg])
        }
      }
      const REQUEST_INTERVAL = Math.min(
        Math.max((this.relayRttAverage-20) * participants.remote.size/40, 0) + 20,
        3*1000)
      const REQUEST_WAIT_TIMEOUT = REQUEST_INTERVAL + 20 * 1000  //  wait 20 sec when failed to receive message.
      const now = Date.now()
      if (now < deadline && this.bmRelaySocket && !this.receivedMessages.length
        && now - this.lastRequestTime > REQUEST_INTERVAL
        && (this.lastReceivedTime >= this.lastRequestTime
          || now - this.lastRequestTime > REQUEST_WAIT_TIMEOUT)){
          this.lastRequestTime = now
          const area = recorder.recording ? [-MAP_SIZE*2, MAP_SIZE*2, MAP_SIZE*2, -MAP_SIZE*2]
            : map.visibleArea()
          this.pushOrUpdateMessageViaRelay(MessageType.REQUEST_RANGE, [area, participants.audibleArea()])
          this.sendMessageViaRelay()
      }
      //  console.log(`step RTT:${this.relayRttAverage} remain:${deadline - Date.now()}/${timeToProcess}`)
    }
    if (!this.stopStep){
      setTimeout(()=>{this.step()}, period)
    }else{
      this.stopStep = false
    }
  }

  // mediasoup
  private createTransport(dir: MSTransportDirection, remote?: RemotePeer){
    const promise = new Promise<mediasoup.types.Transport>((resolve, reject)=>{
      this.connection.createTransport(dir).then(transport => {
        transport.on('connect', ({ dtlsParameters }, callback, errback) => {
          console.log('transport connect event', 'send');
          this.connection.connectTransport(transport, dtlsParameters).then(()=>{
            callback()
          }).catch((error:string)=>{
            console.error(`error in connecting transport:${error}`);
            errback()
            reject()
          })
        });
        if (dir === 'send'){
          transport.on('produce', ({ kind, rtpParameters, appData }, callback, errback) => {
            console.log('transport produce event', appData);
            const track = (appData as ProducerData).track
            this.connection.produceTransport({
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
          console.log(`transport ${transport.id} connectionstatechange ${state}`);
          if (dir==='receive' && state === 'connected'){
            assert(remote)
            const consumers = Array.from(remote.producers.values()).map(p => p.consumer).filter(c => c)
            for(const consumer of consumers){
              this.connection.resumeConsumer(consumer!.id)
              consumer!.resume()
            }
          }
          if (state === 'closed' || state === 'failed' || state === 'disconnected') {
            console.log('transport closed ... leaving the room and resetting');
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
          transport.produce({track:track?.track, appData:{track}}).then( producer => {
            this.localProducers.push(producer)
            resolve(producer)
          })
        })
      }
    })
    return promise
  }
  public removeLocalTrack(track:MSTrack){
    const producer = this.localProducers.find(p => (p.appData as ProducerData).track === track)
    if (producer){
      producer.close()
      this.connection.closeProducer(producer.id)
      this.localProducers = this.localProducers.filter(p => p !== producer)
    }
  }

  public getConsumer(producer: RemoteProducer){
    const promise = new Promise<mediasoup.types.Consumer>((resolve, reject)=>{
      if (producer.consumer){
        resolve(producer.consumer)
      }else{
        this.getReceiveTransport(producer.peer).then(transport => {
          this.connection.consumeTransport(transport.id, producer.id).then(consumeParams=>{
            transport.consume(consumeParams).then(consumer => {
              producer.consumer = consumer
              if (transport.connectionState === 'connected'){
                this.connection.resumeConsumer(consumer.id)
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
  private doSetLocalMicTrack(track:MSTrack) {
    this.localMicTrack = track
    this.addOrReplaceLocalTrack(track)
    participants.local.tracks.audio = track.track
  }
  public setLocalMicTrack(track: MSTrack|undefined){
    const promise = new Promise<MSTrack|undefined>((resolveFunc, rejectionFunc) => {
      if (track) {
        if (this.localMicTrack) {
          const prev = this.localMicTrack
          //  TODO: remove mic track
        }else {
          this.doSetLocalMicTrack(track)
          resolveFunc(undefined)
        }
      }else {
        if (this.localMicTrack) {
          //  TODO: remove mic track
        }else {
          resolveFunc(undefined)
        }
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
      participants.local.tracks.avatar = this.localCameraTrack?.track
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

  sendMessage(type:string, value:any, to?: string) {
      this.pushOrUpdateMessageViaRelay(type, value, to)
  }
  receivedMessages: BMMessage[] = []
  connectToRelayServer(){
    if (this.bmRelaySocket){ return }
    const onOpen = () => {
      this.messagesToSendToRelay = []
      this.sync.sendAllAboutMe(true)
      this.pushOrUpdateMessageViaRelay(MessageType.REQUEST_ALL, {})
      this.sendMessageViaRelay()
    }
    const onMessage = (ev: MessageEvent<any>)=> {
      //  console.log(`ws:`, ev)
      if (typeof ev.data === 'string') {
        this.lastReceivedTime = Date.now()
        this.relayRttLast = this.lastReceivedTime - this.lastRequestTime

        const msgs = JSON.parse(ev.data) as BMMessage[]
        //  console.log(`Relay sock onMessage len:${msgs.length}`)
        //*
        if (msgs.length){
          this.receivedMessages.push(...msgs)
        }
        const alpha = 0.3
        if (msgs.length){
          this.relayRttAverage = alpha * this.relayRttLast + (1-alpha) * this.relayRttAverage
        }
      }
    }
    const onClose = () => {
      setTimeout(()=>{
        this.bmRelaySocket = new WebSocket(config.bmRelayServer)
        setHandler()
      }, 5 * 1000)
    }
    const onError = () => {
      console.error(`Error in WebSocket for ${config.bmRelayServer}`)
      this.bmRelaySocket?.close(3000, 'onError')
      onClose()
    }
    const setHandler = () => {
      this.bmRelaySocket?.addEventListener('error', onError)
      this.bmRelaySocket?.addEventListener('message', onMessage)
      this.bmRelaySocket?.addEventListener('open', onOpen)
      this.bmRelaySocket?.addEventListener('close', onClose)
    }
    this.bmRelaySocket = new WebSocket(config.bmRelayServer)
    setHandler()
  }

  pushOrUpdateMessageViaRelay(type:string, value:any, dest?:string, sendRandP?:boolean) {
    assert(config.bmRelayServer)
    if (!this.bmRelaySocket || this.bmRelaySocket.readyState !== WebSocket.OPEN){ return }
    if (!this.name || !this.peer){
      console.warn(`Relay Socket: Not connected. room:${this.name} id:${this.peer}.`)

      return
    }


    const msg:BMMessage = {t:type, v:''}
    if (sendRandP) {
      msg.r = this.name
      msg.p = this.peer
    }
    if (dest){
      msg.d = dest
    }
    const idx = this.messagesToSendToRelay.findIndex(m =>
      m.t === msg.t && m.r === msg.r && m.p === msg.p && m.d === msg.d)
    if (idx >= 0){
      if (stringArrayMessageTypesForClient.has(msg.t)){
        const oldV = JSON.parse(this.messagesToSendToRelay[idx].v) as string[]
        for(const ne of value as string[]){
          if (oldV.findIndex(e => e === ne) < 0){ oldV.push(ne) }
        }
        this.messagesToSendToRelay[idx].v = JSON.stringify(oldV)
      }else if (ObjectArrayMessageTypes.has(msg.t)){
        const oldV = JSON.parse(this.messagesToSendToRelay[idx].v) as {id:string}[]
        for(const ne of value as {id:string}[]){
          const found = oldV.findIndex(e => e.id === ne.id)
          if (found >= 0){
            oldV[found] = ne
          }else{
            oldV.push(ne)
          }
        }
        this.messagesToSendToRelay[idx].v = JSON.stringify(oldV)
      }else{  //  overwrite
        //console.log(`overwrite messageType: ${msg.t}`)
        msg.v = JSON.stringify(value)
        this.messagesToSendToRelay[idx] = msg
      }
    }else{
      msg.v = JSON.stringify(value)
      this.messagesToSendToRelay.push(msg)
      //console.log(`msg:${JSON.stringify(msg)} messages: ${JSON.stringify(this.messagesToSendToRelay)}`)
    }

    if (recorder.recording){
      msg.p = this.peer
      recorder.recordMessage(msg)
    }
  }
  private sendMessageViaRelay() {
    if (this.messagesToSendToRelay.length === 0){ return }

    if (this.bmRelaySocket?.readyState === WebSocket.OPEN){
      this.bmRelaySocket.send(JSON.stringify(this.messagesToSendToRelay))
      //  console.log(`Sent bmMessages: ${JSON.stringify(this.messagesToSendToRelay)}`)
      this.messagesToSendToRelay = []
    }else{
      //  console.log(`Wait to send bmMessages: ${JSON.stringify(this.messagesToSendToRelay)}`)
      this.bmRelaySocket?.addEventListener('open', ()=> {
        const waitAndSend = ()=>{
          if(this.bmRelaySocket?.readyState !== WebSocket.OPEN){
            setTimeout(waitAndSend, 100)
          }else{
            this.bmRelaySocket?.send(JSON.stringify(this.messagesToSendToRelay))
            this.messagesToSendToRelay = []
          }
        }
        waitAndSend()
      })
    }
  }

  //  event
  onRemoteUpdate(msremotes: MSRemotePeer[]){
    for (const msr of msremotes){
      if (msr.peer === this.peer) continue
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
        newRemote.producers = new Map<string, RemoteProducer>(
          msr.producers.map(msp => ([msp.id, {...msp, peer:newRemote}])))
        this.remotePeers.set(msr.peer, newRemote)
        this.onProducerAdded(Array.from(newRemote.producers.values()))
      }
    }
  }
  onRemoteLeft(remoteIds: string[]){
    for(const id of remoteIds){
      if (id !== this.peer){
        this.remotePeers.delete(id)
        participants.leave(id)
      }
    }
  }

  onProducerAdded(producers: RemoteProducer[]){
    for(const producer of producers){
      this.getConsumer(producer).then((consumer)=>{
        const participant = participants.getOrCreateRemote(producer.peer.peer)
        if (producer.kind === 'audio'){
          participant.tracks.audio = consumer.rtpReceiver?.track
        }else{
          participant.tracks.avatar = consumer.rtpReceiver?.track
        }
      }).catch((e) => {
        console.error(`conference.onProducerAdded(): ${e}`)
      })
    }
  }
  onProducerRemoved(producers: RemoteProducer[]){
    for(const producer of producers){
      if (producer.consumer){
        producer.consumer.close()
        const participant = participants.remote.get(producer.peer.peer)
        if (participant){
          if (producer.role === 'mic'){
            participant.tracks.audio = undefined
          }else if (producer.role === 'camera'){
            participant.tracks.avatar = undefined
          }else{
            console.log(`Prorducer with unknown role ${producer.role} is removed from ${participant.id}`)
            //  TODO:remove content
          }
        }
      }
    }
  }
  //  register event handlers
  private registerJistiConferenceEvents() {
    /*  TODO: add event handler
    this._jitsiConference.on(CONF.ENDPOINT_MESSAGE_RECEIVED, (participant:JitsiParticipant, msg:any) => {
      eventLog(`ENDPOINT_MESSAGE_RECEIVED from ${participant.getId()}`, msg)
      if (msg.values) {
        this.emit(msg.type, participant.getId(), msg.values)
        recorder.recordMessage({t:msg.type, p:participant.getId(), v:JSON.stringify(msg.values)})
      }else {
        this.emit(msg.type, participant.getId(), msg.value)
        recorder.recordMessage({t:msg.type, p:participant.getId(), v:JSON.stringify(msg.value)})
      }
    })
    this._jitsiConference.on(CONF.PARTICIPANT_PROPERTY_CHANGED, (participant:JitsiParticipant, name: string,
                                                                 oldValue:any, value:any) => {
      eventLog(`PARTICIPANT_PROPERTY_CHANGED from ${participant.getId()} prop:${name} old,new:`, oldValue, value)
      if (name !== 'codecType'){
        this.emit(name, participant.getId(), JSON.parse(value), oldValue)
        recorder.recordMessage({t:name, p:participant.getId(), v:value})
      }
    })
    this._jitsiConference.on(CONF.CONFERENCE_JOINED, () => {
      connLog('Joined to a conference room.')
      this.onConferenceJoined()
    })
    this._jitsiConference.on(CONF.USER_JOINED, (id: string, user: JitsiParticipant) => {
      connLog(`New participant[${id}] joined.`)
      this.emit(ConferenceEvents.USER_JOINED, id, user)
    })
    this._jitsiConference.on(CONF.USER_LEFT, (id: string, user: JitsiParticipant) => {
      this.emit(ConferenceEvents.USER_LEFT, id, user)
      connLog('A participant left.')
    })
    this._jitsiConference.on(CONF.TRACK_ADDED, (track: JitsiTrack) => {
      trackLog(`TRACK_ADDED: ${track} type:${track.getType()} usage:${track.getUsageLabel()} tid:${track.getId()} msid:${track.getOriginalStream().id}`)
      if (track.isLocal()) {
        this.onLocalTrackAdded(track as JitsiLocalTrack)
      }else {
        this.emit(ConferenceEvents.REMOTE_TRACK_ADDED, track)
        setTimeout(() => {
          this.reduceBitrate()
        },         3000)
      }
    })
    this._jitsiConference.on(CONF.TRACK_REMOVED, (track: JitsiTrack) => {
      trackLog(`TRACK_REMOVED: ${track} type:${track.getType()} ${track.getUsageLabel()} tid:${track.getId()} msid:${track.getOriginalStream().id}`)
      if (track.isLocal()) {
        this.onLocalTrackRemoved(track as JitsiLocalTrack)
      }else {
        this.emit(ConferenceEvents.REMOTE_TRACK_REMOVED, track)
      }
    })
    this._jitsiConference.on(CONF.REMOTE_TRACK_VIDEOTYPE_CHANGING, (track: JitsiRemoteTrack, newType: string) => {
      participants.removeRemoteTrack(track)
    })
    this._jitsiConference.on(CONF.REMOTE_TRACK_VIDEOTYPE_CHANGED, (track: JitsiRemoteTrack, oldType: string) => {
      participants.addRemoteTrack(track)
    })
    this._jitsiConference.on(CONF.TRACK_MUTE_CHANGED, (track: JitsiTrack) => {
      trackLog(`TRACK_MUTE_CHANGED on ${track}.`)
      if (track.isLocal()) { return }
      const remoteTrack = track as JitsiRemoteTrack
      const target = participants.find(remoteTrack.getParticipantId())
      if (target && remoteTrack.isVideoTrack()) {
        target.muteVideo = remoteTrack.isMuted()
      }
    })

    this._jitsiConference.on(JitsiMeetJS.events.conference.TRACK_AUDIO_LEVEL_CHANGED, (id:string, level:number) => {
      const participant = participantsStore.find(id)
      if (participant) {
        if (! (participant === participantsStore.local && participant.muteAudio)) {
          participant?.setAudioLevel(level)
          //	console.log(`pid:${participant.id} audio:${level}`)
        }else {
          participant?.setAudioLevel(0)
        }
      }
    })

    this._jitsiConference.on(JitsiMeetJS.events.conference.PRIVATE_MESSAGE_RECEIVED,
      (id:string, text:string, timeStamp:number) => {
        eventLog('PRIVATE_MESSAGE_RECEIVED', id, text, timeStamp)
        //  this.emit(ConferenceEvents.PRIVATE_MESSAGE_RECEIVED, id, text, timeStamp)
    })
    this._jitsiConference.on(JitsiMeetJS.events.conference.MESSAGE_RECEIVED,
      (id:string, text:string, timeStamp:number) => {
        eventLog('MESSAGE_RECEIVED', id, text, timeStamp)
        //  this.emit(ConferenceEvents.MESSAGE_RECEIVED, id, text, timeStamp)
    })
    //  connection quality
    this._jitsiConference.on(JitsiMeetJS.events.connectionQuality.LOCAL_STATS_UPDATED,
      (stats:ConnectionQualityStats)=>{participants.local.quality = stats})
    this._jitsiConference.on(JitsiMeetJS.events.connectionQuality.REMOTE_STATS_UPDATED,
      (id:string, stats:ConnectionQualityStats)=>{
        const remote = participants.remote.get(id)
        if (remote) { remote.quality = stats }
      })

    //  kicked
    this._jitsiConference.on(JitsiMeetJS.events.conference.KICKED,
      (p:JitsiParticipant, r:string)=>{this.sync.onKicked(p.getId(),r)})
    }
    */
  }
  /*  on Joined etc
  private onConferenceJoined() {
    //  set localId
    this.localId = '' //TODO: assign real local id.
    participants.setLocalId(this.localId)
    this.sync.observeStart()
    //  create tracks
    for (const prop in participants.local.devicePreference) {
      if (participants.local.devicePreference[prop] === undefined) {
        participants.local.devicePreference[prop] = ''
      }
    }

    //  load wallpapers after 2secs
    if (!config.bmRelayServer){
      setTimeout(contents.loadWallpaper.bind(contents), 2000)
    }

    //  request remote info
    if (config.bmRelayServer){
      this.connectToRelayServer()
    }
  }

  private onLocalTrackRemoved(track: JitsiLocalTrack) {
    const local = participants.local
    if (track.isAudioTrack()) {
      local.tracks.audio = undefined
    } else {
      local.tracks.avatar = undefined
    }
  }
  public getLocalTracks(track ?: TMediaType):JitsiLocalTrack[] {
    return this._jitsiConference ? this._jitsiConference.getLocalTracks(track) : []
  }
  public getLocalVideoTrack(): JitsiLocalTrack | null {
    return this._jitsiConference ? this._jitsiConference.getLocalVideoTrack() : null
  }
  public replaceTrack(oldTrack: JitsiLocalTrack, newTrack: JitsiLocalTrack) {
    if (this._jitsiConference) {
      this._jitsiConference.replaceTrack(oldTrack, newTrack)
    }
  }
  public removeTrack(track: JitsiLocalTrack) {
    return this._jitsiConference?.removeTrack(track)
  }
  public removeTracks(tracks: JitsiLocalTrack[]) {
    tracks.forEach(track =>  this._jitsiConference?.removeTrack(track))
  }
  public addTrack(track: JitsiLocalTrack) {
    this._jitsiConference?.addTrack(track)
  }
  public addTracks(tracks: JitsiLocalTrack[]) {
    for (const track of tracks) {
      if (track !== tracks[tracks.length - 1]) {
        this._jitsiConference?.addTrack(track)
      }else {
        this._jitsiConference?.addTrack(track).then(() => {
          if (TRACKLOG) {
            const locals = this._jitsiConference?.getLocalTracks()
            if (locals) {
              console.groupCollapsed(`addTracks([${tracks.length}]) called for ${tracks.map(t => t.rtcId)}`)
              for (const t of locals) {
                console.log(`${t} rtcid:${t.rtcId} msid:${t.getOriginalStream().id}`)
              }
              console.groupEnd()
            }
          }
        })
      }
    }
  }
  */
}
