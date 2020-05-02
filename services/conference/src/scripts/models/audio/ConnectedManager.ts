import {assert, convertToAudioCoordinate, getRelativePose} from '@models/utils'
import store from '@stores/Participants'
import {autorun, IReactionDisposer} from 'mobx'
import {StereoManager} from './StereoManager'

export class ConnectedManager {
  private readonly manager = new StereoManager()

  private readonly disposers: {
    [key: string]: IReactionDisposer,
  } = {}

  private participantsMemo: string[] = []

  constructor() {
    autorun(this.onPopulationChange)
  }

  private onPopulationChange = () => {
    const currentParticipants = Array.from(store.remote.keys())
    linearReconciliator(this.participantsMemo, currentParticipants, this.remove, this.add)
    this.participantsMemo = currentParticipants
  }

  private remove = (id: string) => {
    this.disposers[id]()
  }

  private add = (id: string) => {
    this.manager.addSpeaker(id)

    const remote = store.find(id)
    assert(remote !== undefined)
    const local = store.local

    this.disposers[id] = autorun(
      () => {
        const relativePose = getRelativePose(local.pose, remote.pose)
        const pose = convertToAudioCoordinate(relativePose)
        this.manager.nodes[id].updatePose(pose)
      },
    )
  }
}

type PopulationChangeAction = (id: string) => void

function linearReconciliator(
  old: string[], current: string[],
  onRemove: PopulationChangeAction, onAdd: PopulationChangeAction) {

  let pOld = 0
  let pCurrent = 0

  // remove discarded
  while (pOld < old.length) {
    if (pCurrent < current.length && old[pOld] === current[pCurrent]) {
      pOld += 1
      pCurrent += 1
    } else {
      onRemove(old[pOld])
      pOld += 1
    }
  }

  // add new
  while (pCurrent < current.length) {
    onAdd(current[pCurrent])
    pCurrent += 1
  }
}
