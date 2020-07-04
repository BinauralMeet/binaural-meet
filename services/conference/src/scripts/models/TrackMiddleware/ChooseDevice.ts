import {connection} from '@models/api'
import participants from '@stores/participants/Participants'
import JitsiMeetJS, {JitsiLocalTrack, JitsiTrackOptions, JitsiValues} from 'lib-jitsi-meet'
import {reaction} from 'mobx'

function replaceTrack(newTrack:JitsiLocalTrack) {
  const oldTracks = connection.conference?.getLocalTracks(newTrack.getType())
  if (oldTracks !== undefined) {
    connection.conference?.replaceTrack(oldTracks[0], newTrack)
  }
}

reaction(
  () => participants.local.get().devicePreference.audioInputDevice,
  (did) => {
    JitsiMeetJS.createLocalTracks({devices:['audio'], micDeviceId: did}).then(
      (tracks: JitsiLocalTrack[]) => { replaceTrack(tracks[0]) },
    )
  },
)

reaction(
  () => participants.local.get().devicePreference.videoInputDevice,
  (did) => {
    JitsiMeetJS.createLocalTracks({devices:['video'], cameraDeviceId: did}).then(
      (tracks: JitsiLocalTrack[]) => {
        replaceTrack(tracks[0])
      },
    )
  },
)
