import {assert} from '@models/utils'
import {NodeGroup} from './NodeGroup'

export class StereoManager {
  private readonly audioContext: AudioContext = new window.AudioContext()

  nodes: {
    [key: string]: NodeGroup,
  } = {}

  addSpeaker(id: string) {
    assert(this.nodes[id] === undefined)
    this.nodes[id] = new NodeGroup(this.audioContext)

    return this.nodes[id]
  }

  removeSpeaker(id: string) {
    console.log('remove speaker')
    delete this.nodes[id]
  }
}
