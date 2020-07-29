import {convertToAudioCoordinate, getRelativePose} from '@models/utils'
import {LocalParticipant} from '@stores/participants/LocalParticipant'
import {RemoteParticipant} from '@stores/participants/RemoteParticipant'
import {JitsiTrack} from 'lib-jitsi-meet'
import {autorun, IObservableValue, IReactionDisposer} from 'mobx'
import {NodeGroup} from './NodeGroup'

import {stereoParametersStore} from '@stores/AudioParameters'
import {ConfigurableProp} from '@stores/AudioParameters/StereoParameters'

export class ConnectedGroup {
  private readonly disposers: IReactionDisposer[] = []

  constructor(local: IObservableValue<LocalParticipant>, remote: RemoteParticipant, group: NodeGroup) {
    this.disposers.push(autorun(
      () => {
        const relativePose = getRelativePose(local.get().pose, remote.pose)
        const pose = convertToAudioCoordinate(relativePose)
        group.updatePose(pose)
      },
    ))

    this.disposers.push(autorun(
      () => {
        const track: JitsiTrack | undefined = remote.tracks.audio
        group.updateStream(track?.getOriginalStream())
      },
    ))

    const observedPannerKeys: ConfigurableProp[] =
      ['coneInnerAngle', 'coneOuterAngle', 'coneOuterGain', 'distanceModel', 'maxDistance', 'distanceModel', 'panningModel', 'refDistance', 'rolloffFactor']
    this.disposers.push(autorun(
      () => observedPannerKeys.forEach((key) => {
        (group.pannerNode[key] as any) = stereoParametersStore[key]
      }),
    ))
  }

  dispose() {
    for (const disposer of this.disposers) {
      disposer()
    }
  }
}
