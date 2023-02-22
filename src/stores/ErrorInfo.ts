import {MAP_SIZE} from '@components/Constants'
import {t} from '@models/locales'
import { defaultInformation } from '@models/Participant'
import {urlParameters} from '@models/url'
import {addV2, diffSet, mulV2} from '@models/utils'
import map from '@stores/Map'
import participants from '@stores/participants/Participants'
import {action, autorun, computed, makeObservable, observable, when} from 'mobx'
import {conference} from '@models/conference'

export type ErrorType = '' | 'connection' | 'retry' | 'noMic' | 'micPermission' | 'rtcTransports' | 'dataConnection' | 'entrance' | 'afk' | 'kicked'

export class ErrorInfo {
  @computed get fatal() { return !this.type }
  @observable type:ErrorType = 'entrance'
  @observable types: Set<ErrorType> = new Set()
  @observable supressedTypes:Set<ErrorType> = new Set()
  reason? = ''
  name? = ''
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
      case 'noMic': return t('etNoMic')
      case 'micPermission': return t('etMicPermission')
      case 'rtcTransports': return t('etRtcConnection')
      case 'dataConnection': return t('etDataConnection')
      case 'entrance': return ''
      case 'afk': return t('afkTitle')
      case 'kicked': return `Kicked by ${this.name}. ${this.reason}`
    }

    return this.type
  }
  @computed get message() {
    switch(this.type){
      case 'connection': return t('emConnection')
      case 'retry': return t('emRetry')
      case 'noMic': return t('emNoMic')
      case 'micPermission': return t('emMicPermission')
      case 'rtcTransports': return t('emRtcConnection')
      case 'dataConnection': return t('emDataConnection')
      case 'entrance': return ''
      case 'afk': return t('afkMessage')
      case 'kicked': return ''
    }

    return `no message defined for ${this.type}`
  }

  show(){
    if (this.type === ''){
      const types = diffSet(this.types, this.supressedTypes)
      if (types.size){
        this.type = types.values().next().value
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
    conference.rtcTransports.addListener('disconnect', this.checkConnection)
  }
  public onDestruct(){
    conference.rtcTransports.removeListener('disconnect', this.checkConnection)
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
    //  even when reload, user interaction is needed to play sound.
    //  const nav = window?.performance?.getEntriesByType('navigation')[0] as any
    //  console.log(nav)
    if (urlParameters.skipEntrance !== null/* || nav.type === 'reload'*/  ){
      this.clear()
      participants.local.sendInformation()
    }
    this.enumerateDevices()
    if (urlParameters.testBot === null)  {
      when(() => this.type === '', () => {
        setTimeout(this.checkConnection.bind(this), 4 * 1000)
      })
    }else { //  testBot
      setTimeout(this.startTestBot.bind(this), 3000)
    }
  }
  @action clear(type?: ErrorType) {
    if (this.type === 'afk'){
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
    if (!conference.isRtcConnected()) {
      this.setType('rtcTransports')
      setTimeout(this.checkConnection.bind(this), 1000)
    }else if (!conference.isDataConnected()){
      this.setType('dataConnection')
      setTimeout(this.checkConnection.bind(this), 1000)
    }else {
      this.clear('rtcTransports')
      this.clear('dataConnection')
      this.checkMic()
    }
  }
  @action checkMic() {
    if (participants.localId && !participants.local.muteAudio && !conference.getLocalMicTrack()) {
      if (this.audioInputs.length) {
        this.setType('micPermission')
        //  this.message += 'You have: '
        //  this.audioInputs.forEach((device) => { this.message += `[${device.deviceId} - ${device.label}]` })
      }else {
        this.clear('micPermission')
        this.setType('noMic')
      }
      setTimeout(this.checkMic.bind(this),   5 * 1000)
    }else {
      if (participants.local.muteAudio){
        setTimeout(this.checkMic.bind(this),   5 * 1000)
      }
      this.clear('noMic')
      this.clear('micPermission')
    }
  }
  //  testBot
  canvas: HTMLCanvasElement|undefined = undefined
  oscillator: OscillatorNode|undefined = undefined
  startTestBot () {
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
      const nearestVideo = conference.priorityCalculator.tracksToConsume.videos[0]?.producer
      const nearestAudio = conference.priorityCalculator.tracksToConsume.audios[0]?.producer
      if (nearestVideo && nearestVideo.consumer?.track.muted) { colors[0] = 'yellow' }
      if (nearestAudio && nearestAudio.consumer?.track.muted) { colors[1] = 'red' }
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
    setInterval(draw, 1000 / 20)
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
        setTimeout(()=>{
          if (!connection.conference._jitsiConference?.room.connected){
            window.location.reload()  //  testBot will reload when channel is closed.
          }
        }, 20 * 1000)
      }
      */
    }
    const win = window as any
    if (win.requestIdleCallback) {
      const moveTask = () => {  //  onIdle, wait 50ms and run move()
        setTimeout(() => {
          move()
          win.requestIdleCallback(moveTask)
        },         50)
      }
      moveTask()
    }else {
      setInterval(move, 1000)
    }

    const vidoeStream = (this.canvas as any).captureStream(20) as MediaStream
    const videoTrack = vidoeStream.getVideoTracks()[0]
    const audioTrack = destination.stream.getAudioTracks()[0]
    conference.setLocalCameraTrack({track:videoTrack, peer:participants.local.id, role:'avatar'})
    conference.setLocalMicTrack({track:audioTrack, peer:participants.local.id, role:'avatar'})
  }
}

const errorInfo = new ErrorInfo()
declare const d:any
d.error = errorInfo
export default errorInfo
