import {connection} from '@models/api/Connection'
import {ConnectionStates} from '@models/api/Constants'
import participants from '@stores/participants/Participants'
import {action, computed, observable} from 'mobx'

type ErrorType = '' | 'connection' | 'noMic' | 'micPermission' | 'channel'

export class ErrorInfo {
  @observable message = ''
  @observable title = ''
  @computed get fatal() { return !this.type }
  @observable type:ErrorType = ''

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
    setTimeout(this.checkConnection.bind(this), 4 * 1000)
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
      this.checkMic()
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
  checkChannel() {
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
}

const errorInfo = new ErrorInfo()
declare const d:any
d.error = errorInfo
export default errorInfo
