import { MAP_SIZE } from '@components/Constants'
import {recorder} from '@models/api/Recorder'
import {KickTime} from '@models/KickTime'
import {assert} from '@models/utils'
import map from '@stores/Map'
import {participantsStore} from '@stores/participants'
import {default as participants} from '@stores/participants/Participants'
import roomInfo from '@stores/RoomInfo'
import contents from '@stores/sharedContents/SharedContents'
import {EventEmitter} from 'events'
import JitsiMeetJS, {JitsiLocalTrack, JitsiRemoteTrack, JitsiTrack, JitsiValues, TMediaType} from 'lib-jitsi-meet'
import {ConnectionQualityStats} from 'lib-jitsi-meet/JitsiConference'
import JitsiParticipant from 'lib-jitsi-meet/JitsiParticipant'
import {makeObservable, observable} from 'mobx'
import {BMMessage} from './BMMessage'
import {ConferenceSync} from './ConferenceSync'
import {ClientToServerOnlyMessageType, MessageType, ObjectArrayMessageTypes, StringArrayMessageTypes} from './MessageType'

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

const CONF = JitsiMeetJS.events.conference
export const ConferenceEvents = {
  USER_JOINED: 'joined',
  USER_LEFT: 'left',
  REMOTE_TRACK_ADDED: 'remote_track_added',
  REMOTE_TRACK_REMOVED: 'remote_track_removed',
//  MESSAGE_RECEIVED: 'message_received',
//  PRIVATE_MESSAGE_RECEIVED: 'prev_message_received',
}

//  Cathegolies of BMMessage's types
const stringArrayMessageTypesForClient = new Set(StringArrayMessageTypes)
stringArrayMessageTypesForClient.add(ClientToServerOnlyMessageType.CONTENT_UPDATE_REQUEST_BY_ID)
stringArrayMessageTypesForClient.add(ClientToServerOnlyMessageType.REQUEST_PARTICIPANT_STATES)

export class Conference extends EventEmitter {
  public _jitsiConference?: JitsiMeetJS.JitsiConference
  public name=''
  public localId = ''
  sync = new ConferenceSync(this)
  @observable channelOpened = false     //  is JVB message channel open ?
  bmRelaySocket:WebSocket|undefined = undefined //  Socket for message passing via separate relay server
  private lastRequestTime = Date.now()
  private lastReceivedTime = Date.now()
  private messagesToSendToRelay: BMMessage[] = []
  relayRttLast = 50
  relayRttAverage = 50

  constructor(){
    super()
    makeObservable(this)
  }

  setRoomProp(name:string, value:string){
    //  console.log(`setRoomProp(${name}, ${value})`)
    this.pushOrUpdateMessageViaRelay(MessageType.ROOM_PROP, [name, value])
    roomInfo.onUpdateProp(name, value)
  }

  public init(name:string, createJitsiConference:()=>JitsiMeetJS.JitsiConference|undefined){
    //  check last kicked time
    if (name){
      const str = window.localStorage.getItem('kickTimes')
      if (str){
        const kickTimes = JSON.parse(str) as KickTime[]
        const found = kickTimes.find(kt => kt.room === name)
        if (found){
          const diff = Date.now() - found.time
          const KICK_WAIT_MIN = 15  //  Can not login KICK_WAIT_MIN minutes once kicked.
          if (diff < KICK_WAIT_MIN * 60 * 1000){
            window.location.reload()

            return
          }
        }
      }
    }

    //  register event handlers and join
    this.name = name
    this._jitsiConference = createJitsiConference()
    this.registerJistiConferenceEvents()
    this.sync.bind()
    this._jitsiConference?.join('')
    this._jitsiConference?.setSenderVideoConstraint(1080)
    //  start relayServer communication.
    this.step()

    //  To access from debug console, add object d to the window.
    d.conference = this
    d.jc = this._jitsiConference
    d.chatRoom = (this._jitsiConference as any).room
    d.showState = () => {
      console.log(`carrierMap: ${JSON.stringify(contents.tracks.carrierMap)}`)
      console.log(`contentCarriers: ${JSON.stringify(contents.tracks.contentCarriers)}`)
      console.log(`remoteMains: ${JSON.stringify(contents.tracks.remoteMains.keys())}`)
    }
  }

  public uninit(){
    if (config.bmRelayServer && participants.localId){
      this.pushOrUpdateMessageViaRelay(MessageType.PARTICIPANT_LEFT, [participants.localId])
      this.sendMessageViaRelay()
    }
    if (participants.local.tracks.audio) {
      this.removeTrack(participants.local.tracks.audio as JitsiLocalTrack)?.then(()=>{
        participants.local.tracks.audio?.dispose()
      })
    }
    if (participants.local.tracks.avatar) {
      this.removeTrack(participants.local.tracks.avatar as JitsiLocalTrack)?.then(()=>{
        participants.local.tracks.avatar?.dispose()
      })
    }
    this.sync.observeEnd()
    //  stop relayServer communication.
    this.stopStep = true

    return new Promise((resolve, reject) => {
      this._jitsiConference?.leave().then((arg) => {
        let logStr = localStorage.getItem('log') ?? ''
        logStr += `leave (${arg}). `
        localStorage.setItem('log', logStr)
        resolve(arg)
      }).catch((reason)=>{
        reject(reason)
      }).finally(()=>{
        this._jitsiConference = undefined
      })
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

  //  Commmands for local tracks --------------------------------------------
  private localMicTrack?: JitsiLocalTrack
  private localCameraTrack?: JitsiLocalTrack
  private doSetLocalMicTrack(track:JitsiLocalTrack) {
    this.localMicTrack = track
    this.localMicTrack.videoType = 'mic'
    this._jitsiConference?.addTrack(this.localMicTrack)
  }
  public setLocalMicTrack(track: JitsiLocalTrack|undefined){
    const promise = new Promise<JitsiLocalTrack|undefined>((resolveFunc, rejectionFunc) => {
      if (track) {
        if (this.localMicTrack) {
          const prev = this.localMicTrack
          this._jitsiConference?.removeTrack(this.localMicTrack).then(() => {
            this.doSetLocalMicTrack(track)
            resolveFunc(prev)
          })
        }else {
          this.doSetLocalMicTrack(track)
          resolveFunc(undefined)
        }
      }else {
        if (this.localMicTrack) {
          this._jitsiConference?.removeTrack(this.localMicTrack).then(() => {
            const prev = this.localMicTrack
            this.localMicTrack = undefined
            resolveFunc(prev)
          })
        }else {
          resolveFunc(undefined)
        }
      }
    })

    return promise

  }


  private doSetLocalCameraTrack(track:JitsiLocalTrack) {
    this.localCameraTrack = track
    this.localCameraTrack.videoType = 'camera'
    this._jitsiConference?.addTrack(this.localCameraTrack)
  }
  public setLocalCameraTrack(track: JitsiLocalTrack|undefined) {
    const promise = new Promise<JitsiLocalTrack|undefined>((resolveFunc, rejectionFunc) => {
      if (track) {
        //  this.cameraTrackConverter(track)
        if (this.localCameraTrack) {
          const prev = this.localCameraTrack
          this._jitsiConference?.removeTrack(this.localCameraTrack).then(() => {
            this.doSetLocalCameraTrack(track)
            resolveFunc(prev)
          })
        }else {
          this.doSetLocalCameraTrack(track)
          resolveFunc(undefined)
        }
      }else {
        if (this.localCameraTrack) {
          this._jitsiConference?.removeTrack(this.localCameraTrack).then(() => {
            const prev = this.localCameraTrack
            this.localCameraTrack = undefined
            resolveFunc(prev)
          })
        }else {
          resolveFunc(undefined)
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

  //  Jitsi API Calls ----------------------------------------
  //  generic send command
  public sendCommand(name: string, values: JitsiValues) {
    sendLog(`SEND sendCommand ${name} ${JSON.stringify(values)}`)
    this._jitsiConference?.sendCommand(name, values)
  }
  public removeCommand(name: string) {
    this._jitsiConference?.removeCommand(name)
  }
  public addCommandListener(name: string, handler: (node: JitsiValues, jid:string, path:string) => void) {
    this._jitsiConference?.addCommandListener(name, handler)
  }
  public setLocalParticipantProperty(name: string, value:Object) {
    sendLog(`SEND setLocalParticipantProperty ${name} ${JSON.stringify(value)}`)
    this._jitsiConference?.setLocalParticipantProperty(name, JSON.stringify(value))
  }
  public getLocalParticipantProperty(name: string): any {
    return this._jitsiConference?.getLocalParticipantProperty(name)
  }
  public kickParticipant(pid: string){
    this._jitsiConference?.kickParticipant(pid)
  }
  //
  public setSenderVideoConstraint(height: number) {
    this._jitsiConference?.setSenderVideoConstraint(height)
  }

  public setReceiverConstraints(videoConstraints: JitsiMeetJS.VideoConstraints){
    this._jitsiConference?.setReceiverConstraints(videoConstraints)
  }

  //  send Perceptibles API added by hasevr
  public setPerceptibles(perceptibles:JitsiMeetJS.BMPerceptibles) {
    //  console.log(`SEND setPerceptibles ${JSON.stringify(perceptibles)}`)
    if (this._jitsiConference?.setPerceptibles) {
      this._jitsiConference.setPerceptibles(perceptibles)
    }
  }

  /**
   * reduce bit rate
   * peerconnection as TraceablePeerConnection
   * peerconnection.peerconnection as RTCPeerConnection */
  private reduceBitrate() {
    if (config.rtc && this._jitsiConference && this._jitsiConference.jvbJingleSession) {
      const jingleSession = this._jitsiConference.jvbJingleSession
      if (!jingleSession.bitRateAlreadyReduced && jingleSession.peerconnection.peerconnection) {
        jingleSession.bitRateAlreadyReduced = true
        const pc = jingleSession.peerconnection.peerconnection
        // console.log('RTCPeerConnect:', pc)
        pc.getSenders().forEach((sender) => {
          // console.log(sender)
          if (sender && sender.track) {
            const params = sender.getParameters()
            // console.log('params:', params)
            if (params.encodings.length === 0) {
              params.encodings.push({})
            }
            params.encodings.forEach((encording) => {
              const ONE_KILO = 1024
              if (sender.track!.kind === 'video' && config.rtc.maxBitrateForVideo) {
                encording.maxBitrate = config.rtc.maxBitrateForVideo * ONE_KILO
              }else if (sender.track!.kind === 'audio') {
                encording.maxBitrate = config.rtc.maxBitrateForAudio * ONE_KILO
              }
            })
            sender.setParameters(params)
          }
        })
      }
    }
  }

  sendMessage(type:string, value:any, to?: string) {
    if (config.bmRelayServer){
      this.pushOrUpdateMessageViaRelay(type, value, to)
    }else{
      this.sendMessageViaJitsi(type, value, to)
    }
  }
  sendMessageViaJitsi(type:string, value:any, to?:string) {
    const jc = this._jitsiConference as any
    const viaBridge = jc?.rtc?._channel?.isOpen() ? true : false
    const connected = jc?.chatRoom?.connection.connected
    sendLog(`SEND sendMessage type:${type} to:${to} val:${JSON.stringify(value)}`)

    if (viaBridge || connected){
      const msg = viaBridge ? {type, value} : JSON.stringify({type, value})
      this._jitsiConference?.sendMessage(msg, to ? to : '', viaBridge)
    }else{
      if (participants.remote.size){
        console.log('Conference.sendMessageViaJitsi() failed: Not connected.')
      }
    }
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
        /*/
        setTimeout(()=>{
          if (msgs.length){
            this.receivedMessages.push(...msgs)
          }
          this.lastReceivedTime = Date.now()
        }, 1000)  //  */
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

      /*  Use Idle
      if ((window as any).requestIdleCallback){
        const idleFunc = (deadline: IdleDeadline) => {
          this.onIdle(deadline);
          (window as any).requestIdleCallback(idleFunc)
        }
        (window as any).requestIdleCallback(idleFunc)
      }*/
      //  Use timer
    }
    this.bmRelaySocket = new WebSocket(config.bmRelayServer)
    setHandler()
  }

  pushOrUpdateMessageViaRelay(type:string, value:any, dest?:string, sendRandP?:boolean) {
    assert(config.bmRelayServer)
    if (!this.bmRelaySocket || this.bmRelaySocket.readyState !== WebSocket.OPEN){ return }
    if (!this.name || !participants.localId){
      console.warn(`Relay Socket: Not connected. room:${this.name} id:${participants.localId}.`)

      return
    }


    const msg:BMMessage = {t:type, v:''}
    if (sendRandP) {
      msg.r = this.name
      msg.p = participants.localId
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
      msg.p = participants.localId
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

  //  register event handlers
  private registerJistiConferenceEvents() {
    if (!this._jitsiConference) {
      console.error('Dose not connected to conference yet.')

      return
    }
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

    //  connection status (bandwidth etc)
    //	this._jitsiConference.statistics.addConnectionStatsListener(this.onConnectionStats)
  }
//  onConnectionStats(tpc: TraceablePeerConnection, stats:Object){
//    console.log(`onConnectionStats: ${JSON.stringify(stats)}`)
//  }
  /*  Resize the video (May not have any effect on the resolution)
  private video:undefined | HTMLVideoElement = undefined
  private canvas:undefined | HTMLCanvasElement = undefined
  private cameraTrackConverter(track: JitsiLocalTrack) {
    if (!this.video) {
      this.video = document.createElement('video')
    }
    this.video.srcObject = new MediaStream([track.getTrack()])
    let aspectRatio = track.getTrack().getSettings().aspectRatio
    const videoCfg = config.rtc.videoConstraints.video
    const VIDEO_SIZE = videoCfg.height.ideal ? videoCfg.height.ideal : videoCfg.width.ideal ? videoCfg.width.ideal : 360
    if (!aspectRatio) { aspectRatio = 1 }
    let sx = 0
    let sy = 0
    if (aspectRatio < 1) {
      this.video.style.width = `${VIDEO_SIZE}px`
      sy = (1 / aspectRatio - 1) * VIDEO_SIZE / 2
    }else {
      this.video.style.height = `${VIDEO_SIZE}px`
      sx = (aspectRatio - 1) * VIDEO_SIZE / 2
    }
    this.video.autoplay = true
    if (!this.canvas) {
      this.canvas = document.createElement('canvas')
      this.canvas.style.width = `${VIDEO_SIZE}px`
      this.canvas.style.height = `${VIDEO_SIZE}px`
      const ctx = this.canvas.getContext('2d')
      const drawVideo = () => {
        if (this.video) {
          ctx?.drawImage(this.video, sx, sy, VIDEO_SIZE, VIDEO_SIZE, 0, 0, VIDEO_SIZE, VIDEO_SIZE)
        }
      }
      const FRAMERATE = 20
      setInterval(drawVideo, 1000 / FRAMERATE)
      const stream = (this.canvas as any).captureStream(FRAMERATE) as MediaStream
      (track as any).track = stream.getVideoTracks()[0]
    }
  }
  */
  private onConferenceJoined() {
    //  set localId
    this.localId = this._jitsiConference!.myUserId()
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

  private onLocalTrackAdded(track: JitsiLocalTrack) {
    const local = participants.local
    if (track.isAudioTrack()) {
      if (local.muteAudio) { track.mute() }
      else { track.unmute() }
      local.tracks.audio = track
    } else {
      local.tracks.avatar = track
      if (local.muteVideo) { this.removeTrack(track) }
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
}
