import {convertToAudioCoordinate, getRelativePose} from '@models/utils'
import {Participant} from '@stores/Participant'
import {autorun, IObservableValue, IReactionDisposer} from 'mobx'
import {NodeGroup} from './NodeGroup'

export class ConnectedGroup {
  private readonly disposers: IReactionDisposer[] = []

  constructor(local: IObservableValue<Participant>, remote: Participant, group: NodeGroup) {
    this.disposers.push(autorun(
      () => {
        const relativePose = getRelativePose(local.get().pose, remote.pose)
        const pose = convertToAudioCoordinate(relativePose)
        group.updatePose(pose)
      },
    ))

    this.disposers.push(autorun(
      () => {
        const stream: MediaStream | undefined = remote.stream.audioStream
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
