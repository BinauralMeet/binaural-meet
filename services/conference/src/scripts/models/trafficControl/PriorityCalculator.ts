import {linearReconciliator} from '@models/utils/linearReconciliator'
import {participantsStore as participants} from '@stores/participants'
import {LocalParticipant} from '@stores/participants/LocalParticipant'
import {RemoteParticipant} from '@stores/participants/RemoteParticipant'
import contents from '@stores/sharedContents/SharedContents'
import {JitsiRemoteTrack} from 'lib-jitsi-meet'
import _ from 'lodash'
import {autorun, IReactionDisposer} from 'mobx'
import {Priority, Props} from './priorityTypes'

function extractPropsFromRemote(participant: RemoteParticipant): (Props|undefined)[] {
  return [
    participant.tracks.avatar ?
      {
        ssrc: (participant.tracks.avatar as JitsiRemoteTrack).getSSRC(),
        onStage : false,
        pose: {
          ...participant.pose,
        },
      } : undefined,
    participant.tracks.audio ?
      {
        ssrc: (participant.tracks.audio as JitsiRemoteTrack).getSSRC(),
        onStage : participant.physics.onStage,
        pose: {
          ...participant.pose,
        },
      } : undefined,
  ]
}
function extractPropsFromLocal(participant: LocalParticipant): Props {
  return {
    ssrc: 0,
    pose: {
      ...participant.pose,
    },
    onStage: false,
  }
}
export class PriorityCalculator {
  // props cache
  private local: Props
  private remoteParticipants: {
    [key: string]: (Props|undefined)[],
  } = {}

  // batch update
  private updateAll = true      // true when local participant is changed
  private readonly updateSet = new Set<string>() // store changed remote participant
  private limits = [-1, -1]     // limits on maximum numbers of remote video and audio tracks.
  private limitUpdated = false  // true when local participant.remoteVideoLimit orremoteAudioLimit changes

  // priority cache
  private readonly videoPriorityMap = new Map<number, number>()
  private readonly audioPriorityMap = new Map<number, number>()
  private lastPriority: Priority = {
    video: [],
    audio: [],
  }

  private disposers: IReactionDisposer[] = []
  private _enabled = false

  constructor() {
    this.local = extractPropsFromLocal(participants.local.get())
  }

  setLimits(limits:number[]):void {
    this.limits[0] = limits[0]
    this.limits[1] = limits[1]
    this.limitUpdated = true
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
      this.local = extractPropsFromLocal(local)

      this.updateAll = true
    })

    // track remote changes
    let oldRemoteParticipants: string[] = []
    const remoteChangeDisposer = autorun(() => {
      const newRemoteParticipants = Array.from(participants.remote.keys())
      linearReconciliator(oldRemoteParticipants, newRemoteParticipants, onRemoveParticipant, onAddParticipant)
      oldRemoteParticipants = newRemoteParticipants
      console.log('prioirty remote chagned:', newRemoteParticipants)
    })
/*
    let oldRemoteMains: string[] = []
    const remoteMainsChangeDisposer = autorun(() => {
      const newRemoteMains = Array.from(contents.tracks.remoteMains.keys())
      Array.from(contents.tracks.remoteMains.keys())
      linearReconciliator(oldRemoteMains, newRemoteMains, onRemoveMain, onAddMain)
      oldRemoteMains = newRemoteMains
    })
    let oldRemoteContents: string[] = []
    const remoteContentsChangeDisposer = autorun(() => {
      const newRemoteContents = Array.from(contents.tracks.remoteContents.keys())
      Array.from(contents.tracks.remoteContents.keys())
      linearReconciliator(oldRemoteContents, newRemoteContents, onRemoveContent, onAddContent)
      oldRemoteContents = newRemoteContents
    })
*/

    const remoteDiposers = new Map<string, IReactionDisposer>()
    const onRemoveParticipant = (id: string) => {
      const disposer = remoteDiposers.get(id)
      if (disposer === undefined) {
        throw new Error(`Cannot find disposer for remote participant with id: ${id}`)
      }
      disposer()
      const removed = this.remoteParticipants[id]
      if (removed[0]) { this.videoPriorityMap.delete(removed[0].ssrc) }
      if (removed[1]) { this.videoPriorityMap.delete(removed[1].ssrc) }
      delete this.remoteParticipants[id]
      remoteDiposers.delete(id)

      this.updateSet.add(id)
    }
    const onAddParticipant = (id: string) => remoteDiposers.set(id, autorun(() => {
      const remote = participants.find(id)
      if (remote === undefined) {
        throw new Error(`Cannot find remote participant with id: ${id}`)
      }
      console.log(`prioirty ${id} chagned v=${(remote.tracks.avatar as JitsiRemoteTrack)?.getSSRC()} a=${(remote.tracks.audio as JitsiRemoteTrack)?.getSSRC()}`)

      this.remoteParticipants[id] = extractPropsFromRemote(remote)
      this.updateSet.add(id)
    }))

    this.disposers = [localChangeDisposer, remoteChangeDisposer]

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
    const recalculateList = Object.keys(this.remoteParticipants).
      filter(key => this.updateAll ? true : this.updateSet.has(key))
    recalculateList.forEach((id) => {
      const props = this.remoteParticipants[id]
      if (props[0]) { this.videoPriorityMap.set(props[0].ssrc, this.getPriorityValue(this.local, props[0])) }
      if (props[1]) { this.audioPriorityMap.set(props[1].ssrc, this.getPriorityValue(this.local, props[1])) }
    })
    const prioritizedSsrcLists = [
      Array.from(this.videoPriorityMap.keys()).sort(
        (a, b) => this.videoPriorityMap.get(a)! - this.videoPriorityMap.get(b)!),
      Array.from(this.audioPriorityMap.keys()).sort(
        (a, b) => this.audioPriorityMap.get(a)! - this.audioPriorityMap.get(b)!),
    ]

    prioritizedSsrcLists.forEach((list, idx) => {
      if (this.limits[idx] >= 0 && list.length > this.limits[idx]) {
        list.splice(this.limits[idx])
      }
    })

    const res: Priority = {
      video: prioritizedSsrcLists[0],
      audio: prioritizedSsrcLists[1],
    }
    this.lastPriority = res

    return res
  }

  // lower value means higher priority
  private getPriorityValue(local: Props, remote: Props): number {
    const position = [local.pose.position, remote.pose.position]
    const distance = Math.pow(position[0][0] - position[1][0], 2) + Math.pow(position[0][1] - position[1][1], 2)

    return distance
  }

  private get haveUpdates(): boolean {
    return this.updateAll || this.updateSet.size !== 0 || this.limitUpdated
  }
}

type Callback = (priority: Priority) => void
