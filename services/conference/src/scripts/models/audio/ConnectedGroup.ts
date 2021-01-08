import {Pose2DMap} from '@models/MapObject'
import {LocalParticipant, RemoteParticipant} from '@models/Participant'
import {SharedContent} from '@models/SharedContent'
import {convertToAudioCoordinate, getRelativePose} from '@models/utils'
import {stereoParametersStore} from '@stores/AudioParameters'
import contents from '@stores/sharedContents/SharedContents'
import {JitsiRemoteTrack, JitsiTrack} from 'lib-jitsi-meet'
import _ from 'lodash'
import {autorun, IObservableValue, IReactionDisposer} from 'mobx'
import {NodeGroup} from './NodeGroup'

function getRelativePoseFromObject(localPose: Pose2DMap, participant: RemoteParticipant|undefined,
                                   content: SharedContent|undefined) {
  const remotePose = _.cloneDeep(participant ? participant.pose :
    content ? content.pose : {position:[0, 0], orientation:0}) as Pose2DMap
  if (content) {
    //  remotePose.position = remotePose.position.map((pos, idx) => pos - 0.5 * content.size[idx]) as [number, number]
    localPose.position.forEach((pos, idx) => {
      if (localPose.position[idx] > remotePose.position[idx]) {
        remotePose.position[idx] += Math.min(content.size[idx], localPose.position[idx] - remotePose.position[idx])
      }
    })
  }

  return getRelativePose(localPose, remotePose)
}

export class ConnectedGroup {
  private readonly disposers: IReactionDisposer[] = []

  constructor(local: IObservableValue<LocalParticipant>, remote: RemoteParticipant|undefined,
              contentTrack: JitsiRemoteTrack|undefined, group: NodeGroup) {
    const carrierId = contentTrack?.getParticipantId()
    const cid = carrierId && contents.tracks.carrierMap.get(carrierId)
    const content = cid ? contents.find(cid) : undefined
    this.disposers.push(autorun(
      () => {
        const base = _.clone(local.get().pose)
        if (local.get().soundLocalizationBase === 'user') {
          base.orientation = 0
        }
        const relativePose = getRelativePoseFromObject(base, remote, content)
        const pose = convertToAudioCoordinate(relativePose)
        group.updatePose(pose)
      },
    ))

    this.disposers.push(autorun(
      () => {
        const track: JitsiTrack | undefined = remote ? remote.tracks.audio : contentTrack
        group.updateStream(track?.getOriginalStream())
      },
    ))

    this.disposers.push(autorun(
      () => group.updatePannerConfig(stereoParametersStore),
    ))

    this.disposers.push(autorun(
      () => group.updateBroadcast(remote?.physics.onStage ? true : false),
    ))
  }

  dispose() {
    for (const disposer of this.disposers) {
      disposer()
    }
  }
}
