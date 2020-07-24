import {default as participants} from '@stores/participants/Participants'
import {JitsiLocalTrack} from 'lib-jitsi-meet'

export function shareScreenStream(tracks: JitsiLocalTrack[]) {
  // TODO add stream to store
  console.log('start sharing screen')
  participants.local.get().tracks.screen = tracks[0]

  // TODO register callback to stop share event
  tracks[0].getTrack().onended = () => {
    console.log('stop sharing screen')
    participants.local.get().tracks.screen = undefined
  }
}
