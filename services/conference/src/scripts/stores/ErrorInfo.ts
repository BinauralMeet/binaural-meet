import {connection} from '@models/api/Connection'
import {ConnectionStates} from '@models/api/Constants'
import {urlParameters} from '@models/url'
import {addV2, mulV2} from '@models/utils'
import {createJitisLocalTracksFromStream} from '@models/utils/jitsiTrack'
import map from '@stores/map'
import participants from '@stores/participants/Participants'
import {action, autorun, computed, observable} from 'mobx'

export type ErrorType = '' | 'connection' | 'noMic' | 'micPermission' | 'channel' | 'enterance'

export class ErrorInfo {
  @observable message = ''
  @computed get fatal() { return !this.type }
  @observable type:ErrorType = 'enterance'
  @observable title = 'Enter the venue'

  constructor() {
    autorun(() => {
      if (this.type) {
        map.keyInputUsers.add('errorDialog')
      }else {
        map.keyInputUsers.delete('errorDialog')
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
    const disposer = autorun(() => {
      if (this.type === '') {
        setTimeout(this.checkConnection.bind(this), 4 * 1000)
        disposer()
      }
    })
  }
  @action clear() {
    this.type = ''
    this.title = ''
    this.message = ''
  }
  @action checkConnection() {
    if (connection.state !== ConnectionStates.CONNECTED) {
      this.type = 'connection'
      this.title = 'No connection'
      this.message = 'Please check internet connection. Binaural Meet uses https. If internet is OK, the server may have problems.'
      setTimeout(this.checkConnection.bind(this), 5 * 1000)
    }else {
      this.clear()
      if (urlParameters.testBot !== null)  {
        this.startTestBot()
      }else {
        this.checkMic()
      }
    }
  }
  @action checkMic() {
    if (!connection.conference.getLocalMicTrack()) {
      if (this.audioInputs.length) {
        this.type = 'micPermission'
        this.title = 'No permission to use microphone'
        this.message = 'Your browser does not permit to use microphone. Please give me the permission and reload your browser.'
        //  this.message += 'You have: '
        //  this.audioInputs.forEach((device) => { this.message += `[${device.deviceId} - ${device.label}]` })
      }else {
        this.type = 'noMic'
        this.title = 'No microphone'
        this.message = 'Please check if your PC has a microphone. Binaural Meet requires it.'
      }

      setTimeout(this.checkMic.bind(this),   5 * 1000)
    }else {
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
        this.title = 'No data channel'
        this.message = 'Please check firewall setting. Binaural Meet connect to port 10000-10010.'
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
    window.AudioContext = window.AudioContext
    const ctxA = new AudioContext()
    this.oscillator = ctxA.createOscillator()
    this.oscillator.type = 'triangle' // sine, square, sawtooth, triangleがある
    const destination = ctxA.createMediaStreamDestination()
    this.oscillator.connect(destination)
    this.oscillator.start()
    //  Create dummy video
    this.canvas = document.createElement('canvas')
    const width = 480
    const height = 270
    this.canvas.style.width = `${width}px`
    this.canvas.style.height = `${height}px`
    const ctx = this.canvas.getContext('2d')
    const center = [Math.random() * 800, Math.random() * 800 - 200]
    const draw = () => {
      if (!ctx || !ctxA) { return }
      //  update audio frequency also
      this.oscillator?.frequency.setValueAtTime(440 + counter % 440, ctxA.currentTime) // 440HzはA4(4番目のラ)
      //  update camera image
      ctx.fillStyle = 'red'
      ctx.beginPath()
      ctx.ellipse(width / 4, height / 4, width * 0.1, height * 0.4, counter / 20, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = 'green'
      ctx.beginPath()
      ctx.ellipse(width / 4, height / 4, width * 0.1, height * 0.4, -counter / 20, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = 'blue'
      ctx.beginPath()
      ctx.ellipse(width / 4, height / 4, width * 0.1, height * 0.4, counter / 10, 0, Math.PI * 2)
      ctx.fill()
      counter += 1
      participants.local.pose.position = addV2(center, mulV2(100, [Math.cos(counter / 60), Math.sin(counter / 60)]))
    }
    setInterval(draw, 1000 / 20)

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
