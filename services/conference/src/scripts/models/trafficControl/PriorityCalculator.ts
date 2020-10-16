import {linearReconciliator} from '@models/utils/linearReconciliator'
import {participantsStore as store} from '@stores/participants'
import {ParticipantBase} from '@stores/participants/ParticipantBase'
import {autorun, IReactionDisposer} from 'mobx'
import {Priority, Props} from './priorityTypes'

function selector(participant: ParticipantBase): Props {
  return {
    id: participant.id,
    pose: {
      ...participant.pose,
    },
  }
}

export class PriorityCalculator {
  // props cache
  private local: Props
  private remotes: {
    [key: string]: Props,
  } = {}

  // batch update
  private updateAll = true  // true when local participant is changed
  private readonly updateSet = new Set<string>() // store changed remote participant

  // priority cache
  private readonly priorityMap: PriorityMap = {}
  private lastPriority: Priority = {
    video: [],
    audio: [],
  }

  private disposers: IReactionDisposer[] = []
  private _enabled = false

  constructor() {
    this.local = selector(store.local.get())
  }

  get enabled(): boolean {
    return this._enabled
  }

  // start observing participants store
  enable() {
    this.updateAll = true

    // track local change
    const localChangeDisposer = autorun(() => {
      const local = store.local.get()
      this.local = selector(local)

      this.updateAll = true
    })

    // track remote change
    let oldRemotes: string[] = []
    const remoteChangeDisposer = autorun(() => {
      const newRemotes = Array.from(store.remote.keys())
      linearReconciliator(oldRemotes, newRemotes, onRemove, onAdd)
      oldRemotes = newRemotes
    })
    const remoteDiposers = new Map<string, IReactionDisposer>()
    const onRemove = (id: string) => {
      const disposer = remoteDiposers.get(id)
      if (disposer === undefined) {
        throw new Error(`Cannot find disposer for remote participant with id: ${id}`)
      }
      disposer()

      delete this.remotes[id]
      remoteDiposers.delete(id)

      this.updateSet.add(id)
    }
    const onAdd = (id: string) => remoteDiposers.set(id, autorun(() => {
      const remote = store.find(id)
      if (remote === undefined) {
        throw new Error(`Cannot find remote participant with id: ${id}`)
      }

      this.remotes[id] = selector(remote)
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

    const priority = this.getPriority()

    this.updateAll = false
    this.updateSet.clear()

    return priority
  }

  private getPriority(): Priority {
    const recalculateList = Object.keys(this.remotes).filter(key => this.updateAll ? true : this.updateSet.has(key))

    recalculateList.forEach((id) => {
      if (this.remotes[id] === undefined) {
        delete this.priorityMap[id]
      } else {
        this.priorityMap[id] = this.getPriorityValue(this.local, this.remotes[id])
      }
    })

    const prioritizedIds = Object.keys(this.remotes).sort((a, b) => this.priorityMap[a] - this.priorityMap[b])

    const res: Priority = {
      video: prioritizedIds,
      audio: prioritizedIds,
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
    return this.updateAll || this.updateSet.size !== 0
  }
}

type Callback = (priority: Priority) => void

interface PriorityMap {
  [key: string]: number
}
