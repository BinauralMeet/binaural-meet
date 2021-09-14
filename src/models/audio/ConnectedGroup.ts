import {MAP_SIZE} from '@components/Constants'
import {Pose2DMap} from '@models/MapObject'
import {LocalParticipant, PARTICIPANT_SIZE, RemoteParticipant} from '@models/Participant'
import {SharedContent} from '@models/SharedContent'
import {addV2, convertToAudioCoordinate, getRelativePose, mulV2, normV, subV2} from '@models/utils'
import {stereoParametersStore} from '@stores/AudioParameters'
import participants from '@stores/participants/Participants'
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
        const fromLT = localPose.position[idx] - remotePose.position[idx]
        remotePose.position[idx] += Math.min(content.size[idx], fromLT > 0 ? fromLT : 0)
      }
    })
  }else if (participant && participants.yarnPhones.has(participant.id)) {
    //  This remote participant is directly connected to local participant
    const diff = subV2(remotePose.position, localPose.position)
    const dist = normV(diff)
    if (dist > PARTICIPANT_SIZE * 0.5) {
      const dir = mulV2(0.5 / dist, diff)
      remotePose.position = addV2(localPose.position, dir)
    }
  }

  return getRelativePose(localPose, remotePose)
}

export class ConnectedGroup {
  private readonly disposers: IReactionDisposer[] = []

  constructor(local: IObservableValue<LocalParticipant>, remote: RemoteParticipant|undefined,
              contentTrack: JitsiRemoteTrack|undefined, group: NodeGroup) {
    this.disposers.push(autorun(
      () => {
        const carrierId = contentTrack?.getParticipantId()
        const cid = carrierId && contents.tracks.carrierMap.get(carrierId)
        const content = cid ? contents.find(cid) : undefined
        const base = _.clone(local.get().pose)
        if (local.get().soundLocalizationBase === 'user') { base.orientation = 0 }
        if (remote && !remote.physics.located) {
          // not located yet -> mute sound
          group.updatePose(convertToAudioCoordinate({orientation:0, position:[MAP_SIZE, MAP_SIZE]}))
        }else {
          const relativePose = getRelativePoseFromObject(base, remote, content)
          const pose = convertToAudioCoordinate(relativePose)
          group.updatePose(pose)
        }
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
