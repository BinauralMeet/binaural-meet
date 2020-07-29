import store from '@stores/participants/Participants'
import {autorun, IObjectDidChange, reaction} from 'mobx'
import {ConnectedGroup} from './ConnectedGroup'
import {StereoManager} from './StereoManager'

import {stereoParametersStore} from '@stores/AudioParameters'
import {assert} from 'console'
import {deepObserve} from 'mobx-utils'

export class ConnectedManager {
  private readonly manager = new StereoManager()

  private readonly connectedGroups: {
    [key: string]: ConnectedGroup,
  } = {}

  private participantsMemo: string[] = []

  constructor() {
    autorun(this.onPopulationChange)

    reaction(
      () => store.local.get().devicePreference.audioOutputDevice,
      (deviceId) => {
        this.manager.setAudioOutput(deviceId)
      },
    )

    reaction(
      () => [store.local.get().useStereoAudio, store.local.get().plugins.streamControl.muteSpeaker],
      ([useStereoAudio, muted]) => {
        this.manager.switchPlayMode(useStereoAudio ? 'Context' : 'Element', muted)
      },
    )

    deepObserve(stereoParametersStore, (change) => {
      const typedChange = change as IObjectDidChange
      assert(typedChange.type === 'update')
      for (const key in this.manager.nodes) {
        const node = this.manager.nodes[key].pannerNode
        Object.assign(node, {
          [typedChange.name]: (typedChange as any).newValue,
        })
      }
    })
  }

  private onPopulationChange = () => {
    const currentParticipants = Array.from(store.remote.keys())
    linearReconciliator(this.participantsMemo, currentParticipants, this.remove, this.add)
    this.participantsMemo = currentParticipants
  }

  private remove = (id: string) => {
    this.connectedGroups[id].dispose()
    delete this.connectedGroups[id]

    this.manager.removeSpeaker(id)
  }

  private add = (id: string) => {
    const group = this.manager.addSpeaker(id)

    const remote = store.find(id)
    const local = store.local

    this.connectedGroups[id] = new ConnectedGroup(local, remote, group)
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
