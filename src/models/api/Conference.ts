import {KickTime} from '@models/KickTime'
import {assert} from '@models/utils'
import map from '@stores/Map'
import {participantsStore} from '@stores/participants'
import {default as participants} from '@stores/participants/Participants'
import contents from '@stores/sharedContents/SharedContents'
import {EventEmitter} from 'events'
import JitsiMeetJS, {JitsiLocalTrack, JitsiRemoteTrack, JitsiTrack, JitsiValues, TMediaType} from 'lib-jitsi-meet'
import JitsiParticipant from 'lib-jitsi-meet/JitsiParticipant'
import {makeObservable, observable} from 'mobx'
import {BMMessage} from './BMMessage'
import {ConferenceSync} from './ConferenceSync'
import {MessageType} from './MessageType'

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

interface IdleDeadline {
  readonly didTimeout: boolean
  timeRemaining(): DOMHighResTimeStamp
}

const CONF = JitsiMeetJS.events.conference
export const ConferenceEvents = {
  USER_JOINED: 'joined',
  USER_LEFT: 'left',
  REMOTE_TRACK_ADDED: 'remote_track_added',
  REMOTE_TRACK_REMOVED: 'remote_track_removed',
//  MESSAGE_RECEIVED: 'message_received',
//  PRIVATE_MESSAGE_RECEIVED: 'prev_message_received',
}

export class Conference extends EventEmitter {
  public _jitsiConference?: JitsiMeetJS.JitsiConference
  public name=''
  public localId = ''
  public joinTime = 0
  sync = new ConferenceSync(this)
  @observable channelOpened = false     //  is JVB message channel open ?
  bmRelaySocket:WebSocket|undefined = undefined //  Socket for message passing via separate relay server

  constructor(){
    super()
    makeObservable(this)
  }

  setRoomProp(name:string, value:string){
    this.sendMessageViaRelay(MessageType.ROOM_PROP, [name, value])
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
    this.joinTime = Date.now()

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
      this.sendMessage(MessageType.PARTICIPANT_LEFT, participants.localId)
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

  lastRequest = 0
  onIdle(deadline: IdleDeadline){
    //console.log(`onIdle time = ${Date.now() % 1000}`)
    if (this.receivedMessages.length){
      /*
      const len = this.receivedMessages.length
      let count = 0
      //  */
      while(deadline.timeRemaining() > 10 && this.receivedMessages.length){
        const msg = this.receivedMessages.shift()
        if (msg){
          this.sync.onBmMessage([msg])
        }
      //  count ++
      }
      //console.log(`onIdle proccessed ${count} / ${len} messages. Remains ${deadline.timeRemaining()}ms.`)
    }else{
      const now = Date.now()
      if (this.bmRelaySocket && (now - this.lastRequest > 50)){
        //  console.log('request msg')
        this.lastRequest = now
        this.sendMessageViaRelay(MessageType.REQUEST_RANGE, [map.visibleArea(), participants.audibleArea()])
      }
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
  public setPerceptibles(perceptibles:[string[], string[]]) {
    sendLog(`SEND setPerceptibles ${perceptibles[0].length} ${perceptibles[1].length}`)
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
    if (this.bmRelaySocket){
      this.sendMessageViaRelay(type, value, to)
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
      console.log(`onOpen ${participants.localId}`)
      this.sendMessageViaRelay(MessageType.REQUEST_ALL, {}, undefined, true)
      this.sync.sendAllAboutMe()
    }
    const onMessage = (ev: MessageEvent<any>)=> {
      //  console.log(`ws:`, ev)
      if (typeof ev.data === 'string') {
        const msgs = JSON.parse(ev.data) as BMMessage[]
        //  console.log(`Len:${msgs.length}: ${ev.data}`)
        this.receivedMessages.push(...msgs)
      }
    }
    const onClose = () => {
      this.bmRelaySocket = new WebSocket(config.bmRelayServer)
      setHandler()
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
      if ((window as any).requestIdleCallback){
        const idleFunc = (deadline: IdleDeadline) => {
          this.onIdle(deadline);
          (window as any).requestIdleCallback(idleFunc)
        }
        (window as any).requestIdleCallback(idleFunc)
      }
    }
    onClose()
  }
  sendMessageViaRelay(type:string, value:any, to?:string, sendRandP?:boolean) {
    assert(this.bmRelaySocket)

    if (this.name && participants.localId){
      const msg:BMMessage = {t:type, v:JSON.stringify(value)}
      if (sendRandP) {
        msg.r = this.name
        msg.p = participants.localId
      }
      if (to){
        msg.t = to
      }
      //  create websocket
      //  send or queue message
      if (this.bmRelaySocket?.readyState === WebSocket.OPEN){
        this.bmRelaySocket.send(JSON.stringify(msg))
      }else{
        this.bmRelaySocket?.addEventListener('open', ()=> {
          const waitAndSend = ()=>{
            if(this.bmRelaySocket?.readyState !== WebSocket.OPEN){
              setTimeout(waitAndSend, 100)
            }else{
              this.bmRelaySocket?.send(JSON.stringify(msg))
            }
          }
          waitAndSend()
        })
      }
    }else{
      console.warn(`Relay Socket: Not connected. room:${this.name} id:${participants.localId}.`)
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
      }else {
        this.emit(msg.type, participant.getId(), msg.value)
      }
    })
    this._jitsiConference.on(CONF.PARTICIPANT_PROPERTY_CHANGED, (participant:JitsiParticipant, name: string,
                                                                 oldValue:any, value:any) => {
      eventLog(`PARTICIPANT_PROPERTY_CHANGED from ${participant.getId()} prop:${name} old,new:`, oldValue, value)
      if (name !== 'codecType'){
        this.emit(name, participant.getId(), JSON.parse(value), oldValue)
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
          participant?.tracks.setAudioLevel(level)
          //	console.log(`pid:${participant.id} audio:${level}`)
        }else {
          participant?.tracks.setAudioLevel(0)
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

    //  kicked
    this._jitsiConference.on(JitsiMeetJS.events.conference.KICKED,
      (p:JitsiParticipant, r:string)=>{this.sync.onKicked(p.getId(),r)})
  }
  /*
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
