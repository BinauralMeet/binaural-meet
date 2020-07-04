import {assert, isChrome} from '@models/utils'
import {NodeGroup} from './NodeGroup'

export class StereoManager {
  private readonly audioContext: AudioContext = new window.AudioContext()
  private readonly audio:HTMLAudioElement = new Audio()

  nodes: {
    [key: string]: NodeGroup,
  } = {}

  constructor() {
    //  Make the audio destination device selectable
    const dest = this.audioContext.createMediaStreamDestination().stream
    this.audio.srcObject = dest
    this.audio.play()

          // For Chrome, resume audio context when loaded (https://goo.gl/7K7WLu)
    // AudioContext must be resumed (or created) after a user gesture on the page.
    const AUDIO_CONTEXT_RESUME_INTERVAL = 1000
    const interval = setInterval(
      () => {
        if (this.audioContext.state !== 'suspended') {
          console.log('AudioContext successfully resumed')
          clearInterval(interval)
        }

        this.audioContext.resume()
      },
      AUDIO_CONTEXT_RESUME_INTERVAL,
    )
  }

  setAudioOutput(did:string) {
    const audio:any = this.audio
    if (audio.setSinkId) {
      audio.setSinkId(did).then(
        () => { console.log('audio.setSinkId:', did, ' success') },
      ).catch(
        () => { console.log('audio.setSinkId:', did, ' failed') },
      )
    }
  }

  addSpeaker(id: string) {
    assert(this.nodes[id] === undefined)
    this.nodes[id] = new NodeGroup(this.audioContext)

    return this.nodes[id]
  }

  removeSpeaker(id: string) {
    console.log('remove speaker')
    this.nodes[id].disconnect()
    delete this.nodes[id]
  }
}
