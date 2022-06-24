import {MAP_SIZE} from '@components/Constants'
import {ISharedContent} from '@models/ISharedContent'
import {LocalParticipant, ParticipantBase, PARTICIPANT_SIZE, PlaybackParticipant, RemoteParticipant} from '@models/Participant'
import {getRect, isCircleInRect, Pose2DMap} from '@models/utils'
import {convertToAudioCoordinate, getRelativePose, mulV2, normV} from '@models/utils'
import {stereoParametersStore} from '@stores/AudioParameters'
import participants from '@stores/participants/Participants'
import contents from '@stores/sharedContents/SharedContents'
import _ from 'lodash'
import {autorun, IObservableValue, IReactionDisposer} from 'mobx'
import {NodeGroup, NodeGroupForPlayback} from './NodeGroup'

const audioLog = false ? console.log : ()=>{}

function getRelativePoseFromObject(localPose: Pose2DMap, participant: ParticipantBase|undefined,
                                   content: ISharedContent|undefined) {
  const remotePose = _.cloneDeep(participant ? participant.pose :
    content ? content.pose : {position:[0, 0], orientation:0}) as Pose2DMap
  if (content) {
    localPose.position.forEach((pos, idx) => {
      if (localPose.position[idx] > remotePose.position[idx]) {
        const fromLT = localPose.position[idx] - remotePose.position[idx]
        remotePose.position[idx] += Math.min(content.size[idx], fromLT > 0 ? fromLT : 0)
      }
    })
  }

  return getRelativePose(localPose, remotePose)
}

export class ConnectedGroup {
  private readonly disposers: IReactionDisposer[] = []

  //  content or remote will be given.
  constructor(obsLocal: IObservableValue<LocalParticipant>, content: ISharedContent|undefined,
    remote: RemoteParticipant|undefined, group: NodeGroup) {
    this.disposers.push(autorun(()=>{
        const local = obsLocal.get()
        const base = _.clone(local.pose)
        if (local.soundLocalizationBase === 'user') { base.orientation = 0 }
        const relativePose = getRelativePoseFromObject(base, remote, content)
        if (remote){
          let remoteInLocalsZone = false  //  Remote is in local's zone or connected by yarn phone.
          let inOtherClosedZone = false
            //  Check where is the remote and the yarn phone connection.
          if (participants.yarnPhones.has(remote.id)){
            remoteInLocalsZone = true
          }else if (remote.closedZone){
            if(remote.closedZone === local.zone){
              remoteInLocalsZone = true
            }else{
              inOtherClosedZone = true
            }
          }
          if (!(inOtherClosedZone||remoteInLocalsZone) && local.zone){
            const rect = getRect(local.zone.pose, local.zone.size)
            remoteInLocalsZone = isCircleInRect(remote.pose.position, 0.5*PARTICIPANT_SIZE, rect)
            inOtherClosedZone = !remoteInLocalsZone && (local.zone.zone==='close' || remote.closedZone?.zone==='close')
          }
          if (!remote.physics.located || inOtherClosedZone) {
            // Not located yet or in different clozed zone -> mute audio
            group.updatePose(convertToAudioCoordinate({orientation:0, position:[MAP_SIZE, MAP_SIZE]}))
            audioLog(`mute ${remote.id} loc:${remote.physics.located} other:${inOtherClosedZone} rInL:${remoteInLocalsZone}`)
          }else{
            if (remoteInLocalsZone){  //  In zone -> make distance very small (1)
              audioLog(`In zone: cid:${remote.id}`)
              const distance = normV(relativePose.position)
              if (distance > 1e-10){ relativePose.position = mulV2(1/distance, relativePose.position) }
            }
            // locate sound source
            group.updatePose(convertToAudioCoordinate(relativePose))
          }
        }else if (content){
          // locate sound source.
          const contentInLocalsZone = local.zone ?
            (content.overlapZones.includes(local.zone) || content.surroundingZones.includes(local.zone)) : false
          const inOtherClosedZone = !contentInLocalsZone && content.surroundingZones.find(z => z.zone === 'close')
          if (contentInLocalsZone){
            //  make distance very small (1)
            audioLog(`In zone: cid:${content.id}`)
            const distance = normV(relativePose.position)
            if (distance > 1e-10){
              relativePose.position = mulV2(1/distance, relativePose.position)
            }
          }else if (inOtherClosedZone) {
            // In different clozed zone -> mute audio
            group.updatePose(convertToAudioCoordinate({orientation:0, position:[MAP_SIZE, MAP_SIZE]}))
            audioLog(`mute ${content.id} other:${inOtherClosedZone} cInL:${contentInLocalsZone}`)
          }
          const pose = convertToAudioCoordinate(relativePose)
          group.updatePose(pose)
        }else{
          console.error(`participant or content must be specified`)
        }
      },
    ))

    this.disposers.push(autorun(
      () => {
        const track = remote ? remote.tracks.audio : contents.getContentTrack(content!.id, 'audio')
        const ms = new MediaStream()
        if (track){
          ms.addTrack(track)
          group.updateStream(ms)
        }
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

export class ConnectedGroupForPlayback {
  private readonly disposers: IReactionDisposer[] = []

  constructor(obsLocal: IObservableValue<LocalParticipant>, play: PlaybackParticipant, group: NodeGroupForPlayback) {
    this.disposers.push(autorun(
      () => {
        const local = obsLocal.get()
        const base = _.clone(local.pose)
        if (local.soundLocalizationBase === 'user') { base.orientation = 0 }
        // locate sound source.
        const relativePose = getRelativePoseFromObject(base, play, undefined)
        const pose = convertToAudioCoordinate(relativePose)
        group.updatePose(pose)
      },
    ))

    this.disposers.push(autorun(
      () => {
        //console.log(`playBlob(${play.audioBlob})`)
        group.playBlob(play.audioBlob)
      },
    ))

    this.disposers.push(autorun(
      () => group.updatePannerConfig(stereoParametersStore),
    ))
  }

  dispose() {
    for (const disposer of this.disposers) {
      disposer()
    }
  }
}
