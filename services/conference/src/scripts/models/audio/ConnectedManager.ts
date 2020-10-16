import {linearReconciliator} from '@models/utils/linearReconciliator'
import {ParticipantBase} from '@stores/participants/ParticipantBase'
import store from '@stores/participants/Participants'
import {assert} from 'console'
import {autorun, IObjectDidChange, reaction} from 'mobx'
import {ConnectedGroup} from './ConnectedGroup'
import {StereoManager} from './StereoManager'

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

    autorun(
      () => {
        this.manager.switchPlayMode(store.local.get().useStereoAudio ? 'Context' : 'Element',
                                    store.local.get().plugins.streamControl.muteSpeaker)
      },
    )
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

    const remote = store.find(id) as ParticipantBase
    const local = store.local
    this.connectedGroups[id] = new ConnectedGroup(local, remote, group)
  }
}
