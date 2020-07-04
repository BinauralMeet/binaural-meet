import {connection} from '@models/api'
import {manager as audioManager} from '@models/audio'
import participants from '@stores/participants/Participants'
import JitsiMeetJS, {JitsiLocalTrack, JitsiTrackOptions, JitsiValues} from 'lib-jitsi-meet'
import {reaction} from 'mobx'

function replaceTrack(newTrack:JitsiLocalTrack) {
  const oldTracks = connection.conference?.getLocalTracks(newTrack.getType())
  if (oldTracks !== undefined) {
    connection.conference?.replaceTrack(oldTracks[0], newTrack)
  }
  const did_ = newTrack.getTrack().getSettings().deviceId
  const did:string = did_ ? did_ : ''
  if (newTrack.getType() === 'audio') {
    participants.local.get().devicePreference.audioInputDevice = did
  }else if (newTrack.getType() === 'video') {
    participants.local.get().devicePreference.videoInputDevice = did
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

reaction(
  () => participants.local.get().devicePreference.audioOutputDevice,
  (deviceId) => {
    audioManager.setAudioOutput(deviceId)
    JitsiMeetJS.mediaDevices.setAudioOutputDevice(deviceId)  //  this not works

    //  participants.local.get().devicePreference.audioOutputDevice = JitsiMeetJS.mediaDevices.getAudioOutputDevice()
  },
)
