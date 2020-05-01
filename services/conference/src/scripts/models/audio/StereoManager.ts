import {NodeGroup} from './NodeGroup'
import {Pose} from '@models/Participant'

export class StereoManager {
  audioContext: AudioContext = new window.AudioContext()
  nodes: {
    [key: string]: NodeGroup,
  } = {}

  addSpeaker(id: string, stream: MediaStream, pose: Pose) {

  }

  removeSpeaker(id: string) {

  }
}
