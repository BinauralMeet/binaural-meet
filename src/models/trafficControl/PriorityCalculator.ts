import {isContentOutOfRange, ISharedContent} from '@models/ISharedContent'
import {PARTICIPANT_SIZE} from '@models/Participant'
import {diffMap} from '@models/utils'
import {participantsStore as participants} from '@stores/participants'
import {LocalParticipant} from '@stores/participants/LocalParticipant'
import {RemoteParticipant} from '@stores/participants/RemoteParticipant'
import contents from '@stores/sharedContents/SharedContents'
import {JitsiRemoteTrack, JitsiTrack} from 'lib-jitsi-meet'
import {autorun, IReactionDisposer, makeObservable, observable} from 'mobx'
import {RemoteTrackInfo, TrackInfo} from './priorityTypes'

export const PRIORITYLOG = false
export const priorityLog = PRIORITYLOG ? console.log : (a:any) => {}
export const priorityDebug = PRIORITYLOG ? console.debug : (a:any) => {}

function extractParticipantTrackInfo(participant: RemoteParticipant, track: JitsiTrack): RemoteTrackInfo {
  return {
    endpointId: participant.id,
    onStage : track.isAudioTrack() &&
      (participant.physics.onStage || participants.yarnPhones.has(participant.id) || participant.inLocalsZone),
    pose: {
      ...participant.pose,
    },
    size: [0, 0],
    offset: 0,
    priority : 0,
    muted: track.isAudioTrack() ? participant.muteAudio : participant.muteVideo
  }
}
function extractContentTrackInfo(content: ISharedContent, track:JitsiTrack): RemoteTrackInfo {
  return {
    endpointId: (track as JitsiRemoteTrack).getParticipantId(),
    onStage : false,
    pose: {
      ...content.pose,
    },
    size: content.size,
    offset: -PARTICIPANT_SIZE * 10,
    priority : 0,
    muted: false,
  }
}
function extractMainTrackInfo(mainTrack:JitsiRemoteTrack): RemoteTrackInfo {
  return {
    endpointId: mainTrack.getParticipantId(),
    onStage : true,
    pose: {position:[0, 0], orientation: 0},
    size: [0, 0],
    offset: -PARTICIPANT_SIZE * 100,
    priority : 0,
    muted: false,
  }
}

function extractPropsFromLocalParticipant(participant: LocalParticipant): TrackInfo {
  return {
    pose: {
      ...participant.pose,
    },
    onStage: false,
  }
}
export class PriorityCalculator {
  // props cache
  private local: TrackInfo

  // batch update
  private updateAll = true      // true when local participant is changed
  private readonly updateSet = new Set<string>() // store changed remote participant
  private limits = [-1, -1]     // limits on maximum numbers of remote video and audio tracks.
  private limitUpdated = false  // true when local participant.remoteVideoLimit orremoteAudioLimit changes

  // priority cache
  private readonly priorityMapForContent = new Map<string, RemoteTrackInfo>()
  private readonly priorityMaps = [new Map<string, RemoteTrackInfo>(), new Map<string, RemoteTrackInfo>()]
  lastContentVideos: string[] = []
  lastParticipantVideos: string[] = []
  lastAudios: string[] = []

  // list of observable track info lists
  @observable tracksToAccept:[RemoteTrackInfo[], RemoteTrackInfo[]] = [[], []]

  private disposers: IReactionDisposer[] = []
  private _enabled = false

  constructor() {
    this.local = extractPropsFromLocalParticipant(participants.local)
    makeObservable(this)
  }

  clear(){
    this.disable()
    this.updateAll = true
    this.updateSet.clear()
    this.priorityMaps.forEach(m => m.clear())
    this.priorityMapForContent.clear()
    this.tracksToAccept = [[],[]]
    this.lastContentVideos = []
    this.lastParticipantVideos = []
    this.lastAudios = []
  }

  setLimits(limits:number[]):void {
    this.limits[0] = limits[0]
    this.limits[1] = limits[1]
    this.limitUpdated = true
  }

  onRemoteTrackAdded(track: JitsiRemoteTrack) {
    this.updateSet.add(track.getParticipantId())
  }

  get enabled(): boolean {
    return this._enabled
  }

  // start observing participants store
  enable() {
    this.updateAll = true

    // track local change
    const localChangeDisposer = autorun(() => {
      const local = participants.local
      this.local = extractPropsFromLocalParticipant(local)

      this.updateAll = true
    })

    // track remote changes
    let oldRemoteParticipants = new Map<string, RemoteParticipant>()
    const remoteChangeDisposer = autorun(() => {
      const newRemoteParticipants = new Map<string, RemoteParticipant>(participants.remote)
      const added = diffMap(newRemoteParticipants, oldRemoteParticipants)
      const removed = diffMap(oldRemoteParticipants, newRemoteParticipants)
      removed.forEach(onRemoveParticipant)
      added.forEach(onAddParticipant)
      oldRemoteParticipants = newRemoteParticipants
      //  priorityLog('prioirty remote chagned:', newRemoteParticipants)
    })

    let oldRemoteContents = new Map<string, Set<JitsiRemoteTrack>>()
    const remoteContentsChangeDisposer = autorun(() => {
      const newRemoteContents = new Map<string, Set<JitsiRemoteTrack>>(contents.tracks.remoteContents)
      const added = diffMap(newRemoteContents, oldRemoteContents)
      const removed = diffMap(oldRemoteContents, newRemoteContents)
      removed.forEach(onRemoveContent)
      added.forEach(onAddContent)
      oldRemoteContents = newRemoteContents
    })

    const remoteDiposers = new Map<string, IReactionDisposer>()
    const onRemoveParticipant = (rp: RemoteParticipant) => {
      const disposer = remoteDiposers.get(rp.id)
      if (disposer === undefined) {
        throw new Error(`Cannot find disposer for remote participant with id: ${rp.id}`)
      }
      disposer()
      this.priorityMaps.forEach(priorityMap => priorityMap.delete(rp.id))
      remoteDiposers.delete(rp.id)
      this.updateSet.add(rp.id)
      priorityLog('onRemoveParticipant:', rp, this.priorityMaps[0])
    }
    const onRemoveContent = (tracks: Set<JitsiRemoteTrack>, id:string) => {
      const disposer = remoteDiposers.get(id)
      if (disposer === undefined) {
        throw new Error(`Cannot find disposer for remote participant with id: ${id}`)
      }
      disposer()
      this.priorityMapForContent.delete(id)
      this.priorityMaps[1].delete(id)
      remoteDiposers.delete(id)
      this.updateSet.add(id)
      priorityLog('onRemoveContent:', id, this.priorityMapForContent)
    }

    const onAddParticipant = (rp: RemoteParticipant) => {
      remoteDiposers.set(rp.id, autorun(() => {
        if (rp.tracks.audio || rp.tracks.avatar) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const important = rp.physics.onStage || participants.yarnPhones.has(rp.id)
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const moved = rp.pose.position
          this.updateSet.add(rp.id)
        }
      }))
      priorityLog('onAddParticipant:', rp, this.priorityMaps[0])
    }
    const onAddContent = (tracks: Set<JitsiRemoteTrack>, id:string) => {
      remoteDiposers.set(id, autorun(() => {
        // tslint:disable-next-line: max-line-length
        //  priorityLog(`prioirty ${id} chagned v=${(rp.tracks.avatar as JitsiRemoteTrack)?.getSSRC()} a=${(rp.tracks.audio as JitsiRemoteTrack)?.getSSRC()}`)
        if (tracks.size) { //  update when number of the tracks changed
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const content = contents.find(id) //  or content changed.
          this.updateSet.add((tracks.values().next().value as JitsiRemoteTrack).getParticipantId())
        }
      }))
      priorityLog('onAddContent:', id, this.priorityMapForContent)
    }

    this.disposers = [localChangeDisposer, remoteChangeDisposer, remoteContentsChangeDisposer]
    this._enabled = true
  }

  // stop observing participants store
  disable() {
    this.disposers.forEach(disposer => disposer())

    this._enabled = false
  }

  // update lastPriority
  update() {
    if (!this.haveUpdates) { return }

    this.calcPriority()

    this.updateAll = false
    this.updateSet.clear()
    this.limitUpdated = false
  }

  private calcPriority() {
    //  list participants
    const remotes = Array.from(participants.remote.values())
    const recalculates = this.updateAll ? remotes
      : remotes.filter(r => this.updateSet.has(r.id))
    for(const rp of recalculates){
      [rp.tracks.avatar, rp.tracks.audio].forEach((track, idx) => {
        if (track) {
          const trackInfo = extractParticipantTrackInfo(rp, track)
          trackInfo.priority = this.calcPriorityValue(this.local, trackInfo)
          this.priorityMaps[idx].set(rp.id, trackInfo)
        }
      })
    }

    //  list contents
    const contentTracks = Array.from(contents.tracks.remoteContents.values())
    const carrierIds = contentTracks.map((tracks) => {
      const next = tracks.values().next()

      return next.done ? undefined : next.value.getParticipantId()
    })

    const recalculateCarrierIds = carrierIds.filter(pid => pid && (this.updateAll ? true : this.updateSet.has(pid)))
    recalculateCarrierIds.forEach((pid) => {
      const cid = contents.tracks.carrierMap.get(pid!)
      const content = cid ? contents.find(cid) : undefined
      if (content && !isContentOutOfRange(content)) {
        const tracks = Array.from(contents.tracks.remoteContents.get(content.id)!)
        const videoAudio = [tracks.find(track => track.isVideoTrack()), tracks.find(track => track.isAudioTrack())]
        const trackInfos:RemoteTrackInfo[] = []
        videoAudio.forEach((track, idx) => {
          if (track) {
            trackInfos[idx] = extractContentTrackInfo(content, track)
            trackInfos[idx].priority = this.calcPriorityValue(this.local, trackInfos[idx])
          }
        })
        if (trackInfos[0]){ this.priorityMapForContent.set(content.id, trackInfos[0]) }
        if (trackInfos[1]){ this.priorityMaps[1].set(content.id, trackInfos[1]) }
      }
    })

    //  update prioritizedTrackLists
    const prioritizedContentTrackInfoList = Array.from(this.priorityMapForContent.values())
      .sort((a, b) => a.priority - b.priority)
    const prioritizedTrackInfoLists = this.priorityMaps.map(priorityMap =>
      Array.from(priorityMap.values()).sort((a, b) => a.priority - b.priority)
    ) as [RemoteTrackInfo[], RemoteTrackInfo[]]

    //  add main tracks
    const mainTracks = contents.tracks.remoteMainTrack()
    if (mainTracks){
      if (mainTracks[0]){
        const mainVideoInfo = extractMainTrackInfo(mainTracks[0])
        prioritizedContentTrackInfoList.unshift(mainVideoInfo)
      }
      if (mainTracks[1]){
        const mainAudioInfo = extractMainTrackInfo(mainTracks[1])
        prioritizedTrackInfoLists[1].unshift(mainAudioInfo)
      }
    }

    //  video
    const contentVideos = prioritizedContentTrackInfoList.filter(info => !info.muted)
    const participantVideos = prioritizedTrackInfoLists[0].filter(info => !info.muted)
    if (contentVideos.length > this.limits[0]){
      contentVideos.splice(this.limits[0])
      participantVideos.splice(0)
    }else{
      participantVideos.splice(this.limits[0] - contentVideos.length)
    }
    //  audio : list all
    const audios = prioritizedTrackInfoLists[1]
    const nMuted = prioritizedTrackInfoLists[1].filter(info => info.muted).length
    audios.splice(Math.min(this.limits[0] + nMuted, audios.length))
    //  done
    this.tracksToAccept = [[...contentVideos, ...participantVideos], audios]

    //  end point ids must be sent to JVB.
    this.lastContentVideos = contentVideos.map(info => info.endpointId)
    this.lastParticipantVideos = participantVideos.map(info => info.endpointId)
    this.lastAudios = audios.map(info => info.endpointId)
  }

  // lower value means higher priority
  private calcPriorityValue(local: TrackInfo, remote: RemoteTrackInfo): number {
    if (remote.onStage) { return 0 }
    const delta = remote.size.map((sz, idx) => {
      let diff = remote.pose.position[idx] - local.pose.position[idx]
      if (diff < 0) {
        diff += sz
        if (diff > 0) { diff = 0 }
      }

      return diff
    })
    const distance = Math.sqrt(delta[0] * delta[0] + delta[1] * delta[1]) + remote.offset

    return distance
    //  const position = [local.pose.position, remote.pose.position]
    //  const distance = Math.pow(position[0][0] - position[1][0], 2) + Math.pow(position[0][1] - position[1][1], 2)
  }

  private get haveUpdates(): boolean {
    return this.updateAll || this.updateSet.size !== 0 || this.limitUpdated
  }
}
