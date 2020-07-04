import {assert, isChrome} from '@models/utils'
import {NodeGroup} from './NodeGroup'

export class StereoManager {
  private readonly audioContext: AudioContext = new window.AudioContext()

  nodes: {
    [key: string]: NodeGroup,
  } = {}

  constructor() {
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
