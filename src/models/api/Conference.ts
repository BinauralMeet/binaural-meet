import {roomInfoPeeperName} from '@models/api/Constants'
import loadController from '@models/trafficControl/loadController'
import {participantsStore} from '@stores/participants'
import {default as participants} from '@stores/participants/Participants'
import {Room} from '@stores/Room'
import {EventEmitter} from 'events'
import JitsiMeetJS, {JitsiValues} from 'lib-jitsi-meet'
import JitsiParticipant from 'lib-jitsi-meet/JitsiParticipant'
import {makeObservable, observable} from 'mobx'
import {roomInfoServer} from '../../index'
import {ConferenceSync, MessageType} from './ConferenceSync'
import {MessageType as RoomInfoMT} from './RoomInfoMessage'

// config.js
declare const config:any             //  from ../../config.js included from index.html

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

const CONF = JitsiMeetJS.events.conference
export const ConferenceEvents = {
  USER_JOINED: 'joined',
  USER_LEFT: 'left',
  REMOTE_TRACK_ADDED: 'remote_track_added',
  REMOTE_TRACK_REMOVED: 'remote_track_removed',
//  MESSAGE_RECEIVED: 'message_received',
//  PRIVATE_MESSAGE_RECEIVED: 'prev_message_received',
}
export interface BMMessage {
  t: string,  //  type
  r: string,  //  room id
  p: string,  //  source pid
  d: string,  //  distination pid
  v: string,  //  JSON value
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
  public room?:Room = undefined

  lastPeriod = -1
  private loadControl(){
    if (this.bmRelaySocket?.readyState === WebSocket.OPEN) {
      //  period should be 50 to 5000 ms
      const target = 0.5
      const period = (1 + Math.round(Math.max(0, (loadController.averagedLoad - target)/(1 - target)) * 39)) * 50
      if (this.lastPeriod !== period){
        this.sendMessage(MessageType.SET_PERIOD, '', period)
      }
      this.lastPeriod = period
      //  console.log(`SET_PERIOD ${period}`)
    }
  }

  setRoomProp(name:string, value:string){
    const roomName = this._jitsiConference?.getName()
    if (roomName && roomInfoServer){
      roomInfoServer.send(RoomInfoMT.ROOM_PROP, roomName, participants.localId, [name, value])
    }
  }

  public init(room: Room, createJitsiConference:()=>JitsiMeetJS.JitsiConference|undefined){
    //  register event handlers and join
    this.room = room
    this.name = room.name
    this._jitsiConference = createJitsiConference()
    this.registerJistiConferenceEvents()
    this.sync.bind()
    this._jitsiConference?.setDisplayName(roomInfoPeeperName)
    this._jitsiConference?.join('')
    this._jitsiConference?.setSenderVideoConstraint(1080)
    this.joinTime = Date.now()
  }

  public uninit(){
    if (config.bmRelayServer && participants.localId){
      this.sendMessage(MessageType.PARTICIPANT_LEFT, '', participants.localId)
    }

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
  public kickParticipant(pid: string){
    this._jitsiConference?.kickParticipant(pid)
  }
  sendMessage(type:string, to:string, value:any) {
    if (config.bmRelayServer){
      this.sendMessageViaRelay(type, to, value)
    }else{
      this.sendMessageViaJitsi(type, to, value)
    }
  }
  sendMessageViaJitsi(type:string, to:string, value:any) {
    const jc = this._jitsiConference as any
    const viaBridge = jc?.rtc?._channel?.isOpen() ? true : false
    const connected = jc?.chatRoom?.connection.connected
    sendLog(`SEND sendMessage type:${type} to:${to} val:${JSON.stringify(value)}`)

    if (viaBridge || connected){
      const msg = viaBridge ? {type, value} : JSON.stringify({type, value})
      this._jitsiConference?.sendMessage(msg, to, viaBridge)
    }else{
      if (participants.remote.size){
        console.log('Conference.sendMessageViaJitsi() failed: Not connected.')
      }
    }
  }
  sendMessageViaRelay(type:string, to:string, value:any) {
    if (this.name && participants.localId){
      const msg:BMMessage = {t:type, r:this.name, p: participants.localId,
        d:to, v:JSON.stringify(value)}
      //  create websocket
      if (!this.bmRelaySocket){
        const onOpen = () => {
          this.sendMessage(MessageType.REQUEST, '', '')
        }
        const onMessage = (ev: MessageEvent<any>)=> {
          //  console.log(`ws:`, ev)
          if (typeof ev.data === 'string') {
            const msgs = JSON.parse(ev.data) as BMMessage[]
            //  console.log(`Len:${msgs.length}: ${ev.data}`)
            this.sync.onBmMessage(msgs)
            this.loadControl()
          }
        }
        const onClose = () => {
          this.bmRelaySocket = new WebSocket(config.bmRelayServer)
          setHandler()
        }
        const onError = () => {
          console.error(`Failed to open ${config.bmRelayServer}`)
          this.sendMessageViaJitsi(type, to, value)
        }
        const setHandler = () => {
          this.bmRelaySocket?.addEventListener('error', onError)
          this.bmRelaySocket?.addEventListener('message', onMessage)
          this.bmRelaySocket?.addEventListener('open', onOpen)
          this.bmRelaySocket?.addEventListener('close', onClose)
        }
        onClose()
      }
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
  }
  private onConferenceJoined() {
    //  set localId
    this.localId = this._jitsiConference!.myUserId()
    participants.setLocalId(this.localId)

    //  request remote info
    if (config.bmRelayServer){
      this.sendMessage(MessageType.REQUEST, '', undefined)
    }
  }
}
