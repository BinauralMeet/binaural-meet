import {assert, isChrome} from '@models/utils'
import errorInfo from '@stores/ErrorInfo'
import {NodeGroup, PlayMode, setAudioOutputDevice} from './NodeGroup'

export class StereoManager {
  private readonly audioContext: AudioContext = new window.AudioContext()
  private readonly audioDestination = this.audioContext.createMediaStreamDestination()

  private readonly audioElement = new Audio()
  private playMode: PlayMode | undefined

  nodes: {
    [key: string]: NodeGroup,
  } = {}

  constructor() {
    if (false) {
      //  For ACE workaround for chrome, make local RTC loopback. But it also make sound monaural and useless.
      const peerGo = new RTCPeerConnection()
      const peerBack = new RTCPeerConnection()
      this.audioDestination.stream.getAudioTracks().forEach(track => peerGo.addTrack(track))
      let inboundStream:MediaStream|undefined = undefined
      peerBack.ontrack = (ev) => {
        if (ev.streams && ev.streams[0]) {
          this.audioElement.srcObject = ev.streams[0]
        }else {
          if (!inboundStream) {
            inboundStream = new MediaStream()
          }
          inboundStream.addTrack(ev.track)
          this.audioElement.srcObject = inboundStream
        }
      }
      peerGo.createOffer().then((offer) => {
        return peerGo.setLocalDescription(offer)
      }).then(() => {
        console.log('peerGo set offer.')
      }).catch((reason) => {
        console.error('peerGo set offer failed', reason)
      })

      let bAnswerSent = false
      peerGo.onicecandidate = (ev) => {
        if (bAnswerSent) { return }
        bAnswerSent = true

        const offer = peerGo.localDescription
        if (offer) {
          peerBack.setRemoteDescription(offer).then(() => {
            peerBack.createAnswer().then((answer) => {
              peerBack.setLocalDescription(answer)
              console.log('peerBack set answer.')

              console.log('peerGo.signalingState', peerGo.signalingState)
              peerGo.setRemoteDescription(answer)
              .then(() => {
                console.log('peerGo set answer.')
              }).catch((err) => {
                console.error('peerGo set answer failed:', err)
              })
            })
          })
        }else {
          console.error('onicecnadidate: offer is null')
        }
      }
    }else {
      this.audioElement.srcObject = this.audioDestination.stream
    }
  }

  addSpeaker(id: string) {
    assert(this.nodes[id] === undefined)
    this.nodes[id] = new NodeGroup(this.audioContext, this.audioDestination,
                                   this.playMode, !this.audioOutputMuted)

    return this.nodes[id]
  }

  removeSpeaker(id: string) {
    //  console.log('remove speaker')
    this.nodes[id].disconnect()
    delete this.nodes[id]
  }

  switchPlayMode(playMode: PlayMode, muted: boolean) {
    if (playMode === this.playMode && muted === this.audioOutputMuted) {
      return
    }
    this.playMode = playMode

    switch (playMode) {
      case 'Context':
        // For Chrome, resume audio context when loaded (https://goo.gl/7K7WLu)
        // AudioContext must be resumed (or created) after a user gesture on the page.
        const interval = setInterval(
          () => {
            if (this.audioContext.state !== 'suspended') {
              //  console.log('AudioContext successfully resumed')
              clearInterval(interval)
            }
            this.audioContext.resume()
            if (!errorInfo.type) {
              this.audioElement.play()  //  play() must be delayed
            }
          },
          1000,
        )

        for (const id in this.nodes) {
          this.nodes[id].setPlayMode(playMode)
        }
        break

      case 'Element':
        this.audioContext.suspend()
        this.audioElement.pause()

        for (const id in this.nodes) {
          this.nodes[id].setPlayMode(playMode)
        }
        break

      default:
        console.error(`Unsupported play mode: ${playMode}`)
        break
    }

    this.audioOutputMuted = muted
  }

  setAudioOutput(deviceId:string) {
    setAudioOutputDevice(this.audioElement, deviceId)
    for (const node in this.nodes) {
      this.nodes[node].setAudioOutput(deviceId)
    }

  }

  set audioOutputMuted(muted: boolean) {
    for (const id in this.nodes) {
      this.nodes[id].updateAudibility(!muted)
    }
    this.audioDestination.stream.getTracks().forEach((track) => { track.enabled = !muted })
  }
  get audioOutputMuted():boolean {
    return !(this.audioDestination.stream.getTracks().length > 0
      && this.audioDestination.stream.getTracks()[0].enabled)
  }
}
