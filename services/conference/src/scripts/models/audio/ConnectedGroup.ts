import {convertToAudioCoordinate, getRelativePose} from '@models/utils'
import {Participant} from '@stores/Participant'
import {autorun, IReactionDisposer} from 'mobx'
import {NodeGroup} from './NodeGroup'

export class ConnectedGroup {
  private readonly disposers: IReactionDisposer[] = []

  constructor(local: Participant, remote: Participant, group: NodeGroup) {
    this.disposers.push(autorun(
      () => {
        const relativePose = getRelativePose(local.pose, remote.pose)
        const pose = convertToAudioCoordinate(relativePose)
        group.updatePose(pose)
      },
    ))

    this.disposers.push(autorun(
      () => {
        const audioStreams = remote.stream.audioStream
        const stream = audioStreams.length === 0 ? undefined : audioStreams[0]
        group.updateStream(stream)
      },
    ))
  }

  dispose() {
    for (const disposer of this.disposers) {
      disposer()
    }
  }
}
