import {MAP_SIZE} from '@components/Constants'
import {t} from '@models/locales'
import { defaultInformation } from '@models/Participant'
import {urlParameters} from '@models/url'
import {addV2, diffSet, mulV2} from '@models/utils'
import map from '@stores/map/Map'
import participants from '@stores/participants/Participants'
import {action, autorun, computed, IReactionDisposer, makeObservable, observable, when} from 'mobx'
import {ConferenceStatusTransport} from './ConferenceStatusTransport'

export type ErrorType = '' | 'connection' | 'retry' | 'reconnecting' | 'noMic' | 'micPermission' | 'rtcTransports' | 'dataConnection' | 'entrance' | 'afk' | 'kicked' | 'noEnterPremission' | 'notAdmin'|'roomInfo'

const RECONNECT_GRACE_MS = 20 * 1000

export class ErrorInfo {
  // Injected once by Conference (the composition root) so this store never
  // imports @models/conference directly. See ConferenceStatusTransport.ts.
  private conferenceStatus?: ConferenceStatusTransport
  public setConferenceStatusTransport(transport: ConferenceStatusTransport) {
    this.conferenceStatus = transport
  }
  @computed get fatal() { return !this.type }
  @observable type:ErrorType = 'entrance'
  @observable types: Set<ErrorType> = new Set()
  @observable supressedTypes:Set<ErrorType> = new Set()
  reason? = ''
  name? = ''
  //  When the connection that had been working was found down; 0 while connected. A drop that
  //  heals within RECONNECT_GRACE_MS is shown as "reconnecting", not as a firewall problem --
  //  returning to a phone's backgrounded tab always looks like this, since Android cuts the
  //  sockets of a frozen page and the client has to reconnect.
  private lostAt = 0
  private everConnected = false
  @action setType(type: ErrorType, name?:string, reason?:string){
    this.type = type
    this.types.add(type)
    this.reason = reason
    this.name = name
  }
  @computed get title() {
    switch(this.type){
      case 'connection': return t('etConnection')
      case 'retry': return t('etRetry')
      case 'reconnecting': return t('etReconnecting')
      case 'noMic': return t('etNoMic')
      case 'micPermission': return t('etMicPermission')
      case 'rtcTransports': return t('etRtcConnection')
      case 'dataConnection': return t('etDataConnection')
      case 'entrance': return ''
      case 'afk': return t('afkTitle')
      case 'kicked': return `Kicked by ${this.name}. ${this.reason}`
      case 'noEnterPremission': return t('enterRoom')
      case 'notAdmin': return t('eAdmin')
      case 'roomInfo': return t('eRoomInfo')
    }

    return this.type
  }
  @computed get message() {
    switch(this.type){
      case 'connection': return t('emConnection')
      case 'retry': return t('emRetry')
      case 'reconnecting': return t('emReconnecting')
      case 'noMic': return t('emNoMic')
      case 'micPermission': return t('emMicPermission')
      case 'rtcTransports': return t('emRtcConnection')
      case 'dataConnection': return t('emDataConnection')
      case 'entrance': return ''
      case 'afk': return t('afkMessage')
      case 'kicked': return ''
      case 'noEnterPremission': return t('enterRoom')
      case 'notAdmin': return t('eAdmin')
      case 'roomInfo': return t('eRoomInfo')
    }

    return `no message defined for ${this.type}`
  }

  show(){
    if (this.type === ''){
      const types = diffSet(this.types, this.supressedTypes)
      if (types.size){
        this.type = types.values().next().value!
      }
    }

    return this.type!=='' && !this.supressedTypes.has(this.type)
  }

  constructor() {
    makeObservable(this)
    if (urlParameters['testBot'] !== null) {
      participants.local.information.name = 'testBot'
      this.clear()
    }
    autorun(() => {
      if (this.show()) {
        map.keyInputUsers.add('errorDialog')
      }else {
        map.keyInputUsers.delete('errorDialog')
      }
    })
    autorun(() => {
      if (participants.local.physics.awayFromKeyboard){
        this.setType('afk')
      }
    })
  }
  public startToListenRtcTransports(){
    this.conferenceStatus?.addRtcDisconnectListener(this.checkConnection)
  }
  public stopToListenRtcTransports(){
    this.conferenceStatus?.removeRtcDisconnectListener(this.checkConnection)
  }
  public onDestruct(){
    this.stopToListenRtcTransports()
    this.checkConnection()
  }

  //  media devices
  private videoInputs:MediaDeviceInfo[] = []
  private audioInputs:MediaDeviceInfo[] = []
  private audioOutputs:MediaDeviceInfo[] = []
  private enumerateDevices() {
    navigator.mediaDevices.enumerateDevices().then((devices) => {
      this.videoInputs = []
      this.audioInputs = []
      this.audioOutputs = []
      devices.forEach((device) => {
        if (device.kind === 'videoinput') { this.videoInputs.push(device) }
        if (device.kind === 'audioinput') { this.audioInputs.push(device) }
        if (device.kind === 'audiooutput') { this.audioOutputs.push(device) }
      })
    }).catch(() => { console.error('Device enumeration error') })
  }
  /// check errors after try to start the connection to the XMPP server.
  @action connectionStart() {
    //console.log(`connectionStart called.`)
    //  even when reload, user interaction is needed to play sound.
    //  const nav = window?.performance?.getEntriesByType('navigation')[0] as any
    //  console.log(nav)
    if (urlParameters.skipEntrance !== null/* || nav.type === 'reload'*/  ){
      this.clear()
      participants.local.sendInformation()
    }
    this.enumerateDevices()
    //console.log(`connectionStart: enumerateDevices called.`)
    if (urlParameters.testBot === null)  {
      when(() => this.type === '', () => {
        //console.log(`connectionStart: when type===${this.type}  checkConnection called.`)
        window.setTimeout(this.checkConnection.bind(this), 4 * 1000)
      })
    }else { //  testBot
      this.enterRoomAsTestBot()
      window.setTimeout(this.startTestBot.bind(this), 3000)
    }
  }
  //  There is no human here to click TheEntrance's "Enter The Venue" button (the only other
  //  caller of preEnter()/enter() -- see components/error/TheEntrance.tsx), and testBot mode
  //  intentionally suppresses that dialog (see the constructor's this.clear() call above) since a
  //  headless bot can't interact with it anyway. So testBot must join the room itself, mirroring
  //  TheEntrance.onClose's guest-entry branch (no Google auth support -- a login-gated room simply
  //  can't be joined by a bot).
  private enterRoomAsTestBot(){
    const room = urlParameters.room ?? ''
    this.conferenceStatus?.preEnter(room).then(loginRequired => {
      if (loginRequired){
        console.warn(`testBot: room "${room}" requires login, testBot cannot join it.`)

        return
      }
      participants.local.information.role = 'guest'
      this.conferenceStatus?.enter(room, undefined, undefined).then(() => {
        this.clear()
        this.startToListenRtcTransports()
      }).catch((e) => { console.warn(`testBot: failed to enter room "${room}".`, e) })
    }).catch((e) => { console.warn(`testBot: preEnter for room "${room}" failed.`, e) })
  }
  @action clear(type?: ErrorType) {
    if (type === 'afk'){
      participants.local.physics.awayFromKeyboard = false
    }
    if (type){
      this.types.delete(type)
      if (this.type === type) { this.type = '' }
    }else{
      this.types.clear()
      this.type = ''
    }
  }
  @action checkConnection = () => {
    const rtc = this.conferenceStatus?.isRtcConnected()
    const data = this.conferenceStatus?.isDataConnected()
    if (!rtc || !data) {
      const now = Date.now()
      if (!this.lostAt){ this.lostAt = now }
      if (this.everConnected && now - this.lostAt < RECONNECT_GRACE_MS){
        this.setType('reconnecting')
      }else{
        this.clear('reconnecting')
        this.setType(rtc ? 'dataConnection' : 'rtcTransports')
      }
      window.setTimeout(this.checkConnection.bind(this), 1000)
    }else {
      this.lostAt = 0
      this.everConnected = true
      this.clear('reconnecting')
      this.clear('rtcTransports')
      this.clear('dataConnection')
      if (urlParameters.testBot === null)  {
        this.checkMic()
      }
    }
  }
  //  Watches the mic once connected: whether it is muted, and whether there is a track at all
  //  (the track store mirrors conference.setLocalMicTrack). Used to re-check every 5s instead.
  private micWatch?: IReactionDisposer
  checkMic() {
    if (this.micWatch){ return }
    this.micWatch = autorun(() => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const observed = [participants.localId, participants.local.muteAudio, participants.local.tracks?.audio]
      this.updateMicError()
    })
  }
  @action private updateMicError() {
    if (participants.localId && !participants.local.muteAudio && !this.conferenceStatus?.getLocalMicTrack()) {
      if (this.audioInputs.length) {
        this.setType('micPermission')
        //  this.message += 'You have: '
        //  this.audioInputs.forEach((device) => { this.message += `[${device.deviceId} - ${device.label}]` })
      }else {
        this.clear('micPermission')
        this.setType('noMic')
      }
    }else {
      this.clear('noMic')
      this.clear('micPermission')
    }
  }
  //  testBot
  canvas: HTMLCanvasElement|undefined = undefined
  oscillator: OscillatorNode|undefined = undefined
  startTestBot() {
    participants.local.muteAudio = false
    participants.local.muteVideo = false
    let counter = 0
    //  Create dummy audio
    const ctxA = new AudioContext()
    this.oscillator = ctxA.createOscillator()
    this.oscillator.type = 'triangle' // sine, square, sawtooth, triangle
    const destination = ctxA.createMediaStreamDestination()
    this.oscillator.connect(destination)
    this.oscillator.start()
    //  Create dummy video
    this.canvas = document.createElement('canvas')
    const width = 240
    const height = 240
    this.canvas.style.width = `${width}px`
    this.canvas.style.height = `${height}px`
    const ctx = this.canvas.getContext('2d')
    const center = [Math.random() * MAP_SIZE / 2, (Math.random() - 0.5) * MAP_SIZE]
    const draw = () => {
      if (!ctx || !ctxA) { return }
      //  update audio frequency also
      this.oscillator?.frequency.setValueAtTime(440 + counter % 440, ctxA.currentTime) // 440HzはA4(4番目のラ)
      //  update camera image
      const colors = ['green', 'blue']
      if (this.conferenceStatus?.isNearestVideoMuted()) { colors[0] = 'yellow' }
      if (this.conferenceStatus?.isNearestAudioMuted()) { colors[1] = 'red' }
      ctx.fillStyle = colors[0]
      ctx.beginPath()
      ctx.ellipse(width * 0.63, height * 0.33, width * 0.1, height * 0.4, counter / 20, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = colors[1]
      ctx.beginPath()
      ctx.ellipse(width * 0.63, height * 0.33, width * 0.1, height * 0.4, -counter / 20, 0, Math.PI * 2)
      ctx.fill()
      counter += 1
    }
    window.setInterval(draw, 1000 / 20)
    const chars = '01234567890ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijlkmnopqrstuvwxyz'
    const randChar = () =>  chars.substr(Math.floor(Math.random() * chars.length), 1)
    participants.local.information = defaultInformation
    participants.local.information.name = `testBot ${randChar()}${randChar()}${randChar()}`
    participants.local.sendInformation()
    participants.local.pose.position = center as [number, number]

    const move = () => {
      participants.local.pose.position = addV2(center, mulV2(100, [Math.cos(counter / 60), Math.sin(counter / 60)]))
      //  Reload when not connected.
      //  This does not work well: It causes unnecessary reload because WebSocket can often be reconnected.
      /*
      if (urlParameters.testBot !== null &&
          connection.conference._jitsiConference?.room &&
          !connection.conference._jitsiConference?.room.connected){
        window.setTimeout(()=>{
          if (!connection.conference._jitsiConference?.room.connected){
            window.location.reload()  //  testBot will reload when channel is closed.
          }
        }, 20 * 1000)
      }
      */
    }
    /*
    const win = window as any
    if (win.requestIdleCallback) {
      const moveTask = () => {  //  onIdle, wait 50ms and run move()
        window.setTimeout(() => {
          move()
          win.requestIdleCallback(moveTask)
        },         50)
      }
      moveTask()
    }else {
      window.setInterval(move, 1000)
    }*/
    window.setInterval(move, 500)

    const vidoeStream = (this.canvas as any).captureStream(20) as MediaStream
    const videoTrack = vidoeStream.getVideoTracks()[0]
    const audioTrack = destination.stream.getAudioTracks()[0]
    this.conferenceStatus?.setLocalCameraTrack({track:videoTrack, peer:participants.local.id, role:'avatar'})
    this.conferenceStatus?.setLocalMicTrack({track:audioTrack, peer:participants.local.id, role:'avatar'})
  }
}

const errorInfo = new ErrorInfo()
declare const d:any
d.error = errorInfo
export default errorInfo
