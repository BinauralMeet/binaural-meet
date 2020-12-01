import {assert} from '@models/utils'
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
    this.audioElement.srcObject = this.audioDestination.stream
  }

  addSpeaker(id: string) {
    assert(this.nodes[id] === undefined)
    this.nodes[id] = new NodeGroup(this.audioContext, this.audioDestination, this.playMode)

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
            this.audioElement.play()  //  play() must be delayed
          },
          1000,
        )

        for (const id in this.nodes) {
          this.nodes[id].usePlayMode(playMode)
        }
        break

      case 'Element':
        this.audioContext.suspend()
        this.audioElement.pause()

        for (const id in this.nodes) {
          this.nodes[id].usePlayMode(playMode)
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
    console.debug('audioOutputMuted', muted)
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
