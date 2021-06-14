import {MAP_SIZE} from '@components/map/Base'
import {connection} from '@models/api'
import {ConnectionStates} from '@models/api/Constants'
import {t} from '@models/locales'
import {priorityCalculator} from '@models/middleware/trafficControl'
import {urlParameters} from '@models/url'
import {addV2, mulV2} from '@models/utils'
import {createJitisLocalTracksFromStream} from '@models/utils/jitsiTrack'
import map from '@stores/Map'
import participants from '@stores/participants/Participants'
import {action, autorun, computed, makeObservable, observable, when} from 'mobx'

export type ErrorType = '' | 'connection' | 'retry' | 'noMic' | 'micPermission' | 'channel' | 'enterance' | 'afk'

export class ErrorInfo {
  @observable message = ''
  @computed get fatal() { return !this.type }
  @observable type:ErrorType = 'enterance'
  @observable title = ''
  @observable supressedTypes:Set<ErrorType> = new Set()
  show(){
    return this.type!=='' && !this.supressedTypes.has(this.type)
  }

  constructor() {
    makeObservable(this)
    if (urlParameters['testBot'] !== null) {
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
      if (participants.local.awayFromKeyboard){
        this.title = t('afkTitle')
        this.type = 'afk'
    }
    })
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
    this.enumerateDevices()
    if (urlParameters.testBot === null)  {
      when(() => this.type === '', () => {
        setTimeout(this.checkConnection.bind(this), 4 * 1000)
      })
    }else { //  testBot
      setTimeout(this.startTestBot.bind(this), 3000)
    }
  }
  @action clear() {
    if (this.type === 'afk'){
      participants.local.awayFromKeyboard = false
    }
    this.type = ''
    this.title = ''
    this.message = ''
  }
  @action checkConnection() {
    if (connection.state !== ConnectionStates.CONNECTED) {
      this.type = 'connection'
      this.title = t('etConnection')
      this.message = t('emConnection')
      setTimeout(this.checkConnection.bind(this), 5 * 1000)
    }else {
      this.clear()
      this.checkMic()
    }
  }
  @action checkMic() {
    if (!participants.local.muteAudio && !connection.conference.getLocalMicTrack()) {
      if (this.audioInputs.length) {
        this.type = 'micPermission'
        this.title = t('etMicPermission')
        this.message = t('emMicPermission')
        //  this.message += 'You have: '
        //  this.audioInputs.forEach((device) => { this.message += `[${device.deviceId} - ${device.label}]` })
      }else {
        this.type = 'noMic'
        this.title = t('etNoMic')
        this.message = t('emNoMic')
      }
      setTimeout(this.checkMic.bind(this),   5 * 1000)
    }else {
      if (participants.local.muteAudio){
        setTimeout(this.checkMic.bind(this),   5 * 1000)
      }
      this.clear()
      this.checkRemote()
    }
  }
  checkRemote() {
    if (participants.remote.size > 0) {
      setTimeout(this.checkChannel.bind(this), 3 * 1000)
    }else {
      setTimeout(this.checkRemote.bind(this), 1 * 1000)
    }
  }
  @action checkChannel() {
    if (participants.remote.size > 0) {
      if (!connection.conference._jitsiConference?.rtc._channel?.isOpen()) {
        this.type = 'channel'
        this.title = t('etNoChannel')
        this.message = t('emNoChannel')
        setTimeout(this.checkChannel.bind(this), 5 * 1000)
      }else {
        this.clear()
      }
    }else {
      this.checkRemote()
    }
  }
  canvas: HTMLCanvasElement|undefined = undefined
  oscillator: OscillatorNode|undefined = undefined
  startTestBot () {
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
      if (priorityCalculator.tracksToAccept[0][0]?.track.getTrack()?.muted) { colors[0] = 'yellow' }
      if (priorityCalculator.tracksToAccept[1][0]?.track.getTrack()?.muted) { colors[1] = 'red' }
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
    participants.local.information.name = `testBot ${randChar()}${randChar()}${randChar()}`
    participants.local.pose.position = center as [number, number]
    //  participants.local.remoteAudioLimit = 2
    //  participants.local.remoteVideoLimit = 1

    const move = () => {
      participants.local.pose.position = addV2(center, mulV2(100, [Math.cos(counter / 60), Math.sin(counter / 60)]))
    }
    const win = window as any
    if (win.requestIdleCallback) {
      const moveTask = () => {  //  onIdle, wait 500ms and run move()
        setTimeout(() => {
          move()
          win.requestIdleCallback(moveTask)
        },         500)
      }
      moveTask()
    }else {
      setInterval(move, 1000)
    }

    const vidoeStream = (this.canvas as any).captureStream(20) as MediaStream
    const audioStream = destination.stream
    const stream = new MediaStream()
    stream.addTrack(audioStream.getAudioTracks()[0])
    stream.addTrack(vidoeStream.getVideoTracks()[0])
    createJitisLocalTracksFromStream(stream).then(
      (tracks) => {
        connection.conference.setLocalCameraTrack(tracks[0])
        connection.conference.setLocalMicTrack(tracks[1])
      },
    )
  }
}

const errorInfo = new ErrorInfo()
declare const d:any
d.error = errorInfo
export default errorInfo
