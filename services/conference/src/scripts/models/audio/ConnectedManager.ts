import {RemoteParticipant} from '@models/Participant'
import {diffMap} from '@models/utils'
import store from '@stores/participants/Participants'
import {autorun, reaction} from 'mobx'
import {ConnectedGroup} from './ConnectedGroup'
import {StereoManager} from './StereoManager'
export class ConnectedManager {
  private readonly manager = new StereoManager()

  private readonly connectedGroups: {
    [key: string]: ConnectedGroup,
  } = {}

  private participantsMemo = new Map<string, RemoteParticipant>()

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
    const newRemotes = new Map(store.remote)
    const added = diffMap(newRemotes, this.participantsMemo)
    const removed = diffMap(this.participantsMemo, newRemotes)
    removed.forEach(this.remove)
    added.forEach(this.add)
    this.participantsMemo = newRemotes
    //  console.log('Update connectedGroups:', this.connectedGroups)
  }

  private remove = (rp: RemoteParticipant) => {
    const id = rp.id
    this.connectedGroups[id].dispose()
    delete this.connectedGroups[id]

    this.manager.removeSpeaker(id)
  }

  private add = (remote: RemoteParticipant) => {
    const group = this.manager.addSpeaker(remote.id)
    this.connectedGroups[remote.id] = new ConnectedGroup(store.local, remote, group)
  }
}
