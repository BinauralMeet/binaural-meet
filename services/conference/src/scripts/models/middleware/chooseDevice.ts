import {connection} from '@models/api'
import {manager as audioManager} from '@models/audio'
import participants from '@stores/participants/Participants'
import JitsiMeetJS, {JitsiLocalTrack} from 'lib-jitsi-meet'
import {reaction} from 'mobx'

reaction(
  () => participants.local.devicePreference.audioInputDevice,
  (did) => {
    const track = connection.conference.getLocalMicTrack()
    if (track && track.getDeviceId() === did) { return }
    JitsiMeetJS.createLocalTracks({devices:['audio'], micDeviceId: did}).then(
      (tracks: JitsiLocalTrack[]) => { connection.conference.setLocalMicTrack(tracks[0]) },
    )
  },
)

// config.js
declare const config:any                  //  from ../../config.js included from index.html
reaction(
  () => participants.local.devicePreference.videoInputDevice,
  (did) => {
    const track = connection.conference.getLocalCameraTrack()
    if (track && track.getDeviceId() === did) { return }
    JitsiMeetJS.createLocalTracks({devices:['video'],
      constraints: config.rtc.videoConstraints, cameraDeviceId: did}).then(
      (tracks: JitsiLocalTrack[]) => {
        connection.conference.setLocalCameraTrack(tracks[0])
      },
    )
  },
)

reaction(
  () => participants.local.devicePreference.audioOutputDevice,
  (deviceId) => {
    if (deviceId) {
      audioManager.setAudioOutput(deviceId)
    }
  },
)

