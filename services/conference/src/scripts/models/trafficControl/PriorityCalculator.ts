import {SharedContent} from '@models/SharedContent'
import {diffMap} from '@models/utils'
import {participantsStore as participants} from '@stores/participants'
import {LocalParticipant} from '@stores/participants/LocalParticipant'
import {RemoteParticipant} from '@stores/participants/RemoteParticipant'
import contents from '@stores/sharedContents/SharedContents'
import {JitsiRemoteTrack, JitsiTrack} from 'lib-jitsi-meet'
import _ from 'lodash'
import {autorun, IReactionDisposer} from 'mobx'
import {Priority, RemoteTrackInfo, TrackInfo} from './priorityTypes'

export const PRIORITYLOG = false
export const priorityLog = PRIORITYLOG ? console.log : (a:any) => {}
export const priorityDebug = PRIORITYLOG ? console.debug : (a:any) => {}

function extractParticipantTrackInfo(participant: RemoteParticipant, track:JitsiTrack): RemoteTrackInfo {
  return {
    track: track as JitsiRemoteTrack,
    onStage : !track.isVideoTrack() && participant.physics.onStage,
    pose: {
      ...participant.pose,
    },
    size: [0, 0],
    priority: 0,
  }
}
function extractContentTrackInfo(content: SharedContent, track:JitsiTrack): RemoteTrackInfo {
  return {
    track: track as JitsiRemoteTrack,
    onStage : false,
    pose: {
      ...content.pose,
    },
    size: content.size,
    priority: 0,
  }
}
function extractMainTrackInfo(mainTrack:JitsiRemoteTrack): RemoteTrackInfo {
  return {
    track: mainTrack,
    onStage : true,
    pose: {position:[0, 0], orientation: 0},
    size: [0, 0],
    priority: 0,
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
  private readonly priorityMaps = [new Map<string, RemoteTrackInfo>(), new Map<string, RemoteTrackInfo>()]
  private lastPriority: Priority = {
    video: [],
    audio: [],
  }

  private disposers: IReactionDisposer[] = []
  private _enabled = false

  constructor() {
    this.local = extractPropsFromLocalParticipant(participants.local.get())
  }

  setLimits(limits:number[]):void {
    this.limits[0] = limits[0]
    this.limits[1] = limits[1]
    this.limitUpdated = true
  }

  onAddRemoteTrack(track: JitsiRemoteTrack) {
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
      const local = participants.local.get()
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
      this.priorityMaps.forEach(priorityMap => priorityMap.delete(id))
      remoteDiposers.delete(id)
      this.updateSet.add(id)
      priorityLog('onRemoveContent:', id, this.priorityMaps[0])
    }

    const onAddParticipant = (rp: RemoteParticipant) => {
      remoteDiposers.set(rp.id, autorun(() => {
        // tslint:disable-next-line: max-line-length
        //  priorityLog(`prioirty ${id} chagned v=${(rp.tracks.avatar as JitsiRemoteTrack)?.getSSRC()} a=${(rp.tracks.audio as JitsiRemoteTrack)?.getSSRC()}`)
        if (rp.tracks.audio || rp.tracks.avatar) {
          this.updateSet.add(rp.id)
        }
      }))
      priorityLog('onAddParticipant:', rp, this.priorityMaps[0])
    }
    const onAddContent = (tracks: Set<JitsiRemoteTrack>, id:string) => {
      remoteDiposers.set(id, autorun(() => {
        // tslint:disable-next-line: max-line-length
        //  priorityLog(`prioirty ${id} chagned v=${(rp.tracks.avatar as JitsiRemoteTrack)?.getSSRC()} a=${(rp.tracks.audio as JitsiRemoteTrack)?.getSSRC()}`)
        if (tracks.size) {
          this.updateSet.add(id)
        }
      }))
      priorityLog('onAddContent:', id, this.priorityMaps[0])
    }

    this.disposers = [localChangeDisposer, remoteChangeDisposer, remoteContentsChangeDisposer]
    this._enabled = true
  }

  // stop observing participants store
  disable() {
    this.disposers.forEach(disposer => disposer())

    this._enabled = false
  }

  // returns same reference when no updates
  update(): Priority {
    if (!this.haveUpdates) {
      return this.lastPriority
    }

    const priority = this.calcPriority()

    this.updateAll = false
    this.updateSet.clear()
    this.limitUpdated = false

    return priority
  }

  private calcPriority(): Priority {
    //  list participants
    const recalculateList = Array.from(participants.remote.keys()).
      filter(key => this.updateAll ? true : this.updateSet.has(key))
    recalculateList.forEach((id) => {
      const rp = participants.remote.get(id)
      if (rp) {
        [rp.tracks.avatar, rp.tracks.audio].forEach((track, idx) => {
          if (track) {
            const trackInfo = extractParticipantTrackInfo(rp, track)
            trackInfo.priority = this.calcPriorityValue(this.local, trackInfo)
            this.priorityMaps[idx].set(rp.id, trackInfo)
          }
        })
      }
    })
    //  list contents
    const contentTracks = Array.from(contents.tracks.remoteContents.values())
    const contentIds = contentTracks.map((tracks) => {
      const next = tracks.values().next()

      return next.done ? undefined : next.value.getContentId()
    })
    const recalculateContentsList = contentIds.filter(key => key && (this.updateAll ? true : this.updateSet.has(key)))
    recalculateContentsList.forEach((id) => {
      const content = contents.find(id!)
      if (content) {
        const tracks = Array.from(contents.tracks.remoteContents.get(content.id)!)
        const videoAudio = [tracks.find(track => track.isVideoTrack()), tracks.find(track => track.isAudioTrack())]
        videoAudio.forEach((track, idx) => {
          if (track) {
            const trackInfo = extractContentTrackInfo(content, track)
            trackInfo.priority = this.calcPriorityValue(this.local, trackInfo)
            this.priorityMaps[idx].set(content.id, trackInfo)
          }
        })
      }
    })


    const prioritizedTrackInfoLists =
      this.priorityMaps.map(priorityMap => Array.from(priorityMap.values()).sort((a, b) => a.priority - b.priority))

    const mainTracks = contents.tracks.remoteMainTrack()
    if (mainTracks) {
      prioritizedTrackInfoLists.forEach((list, idx) => {
        const mainTrack = mainTracks[idx]
        if (mainTrack) {
          const mainInfo = extractMainTrackInfo(mainTrack)
          list.unshift(mainInfo)
        }
      })
    }

    prioritizedTrackInfoLists.forEach((list, idx) => {
      if (this.limits[idx] >= 0 && list.length > this.limits[idx]) {
        list.splice(this.limits[idx])
      }
    })
    const prioritizedSsrcLists = prioritizedTrackInfoLists.map((infos) => {
      const rv:number[] = []
      for (const info of infos) {
        rv.push(... info.track.getSSRCs())
      }

      return rv
    })

    const res: Priority = {
      video: prioritizedSsrcLists[0],
      audio: prioritizedSsrcLists[1],
    }
    this.lastPriority = res

    return res
  }

  // lower value means higher priority
  private calcPriorityValue(local: TrackInfo, remote: RemoteTrackInfo): number {
    const delta = remote.size.map((sz, idx) => {
      let diff = remote.pose.position[idx] - local.pose.position[idx]
      if (diff < 0) {
        diff += sz
        if (diff > 0) { diff = 0 }
      }

      return diff
    })
    const distance2 = delta[0] * delta[0] + delta[1] * delta[1]

    return distance2
    //  const position = [local.pose.position, remote.pose.position]
    //  const distance = Math.pow(position[0][0] - position[1][0], 2) + Math.pow(position[0][1] - position[1][1], 2)
  }

  private get haveUpdates(): boolean {
    return this.updateAll || this.updateSet.size !== 0 || this.limitUpdated
  }
}
