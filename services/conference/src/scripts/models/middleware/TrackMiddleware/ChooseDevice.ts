import {connection} from '@models/api'
import participants from '@stores/participants/Participants'
import JitsiMeetJS, {JitsiLocalTrack} from 'lib-jitsi-meet'
import {reaction} from 'mobx'
/*
function replaceTrack(newTrack:JitsiLocalTrack) {
  const oldTracks = connection.conference.getLocalTracks(newTrack.getType())
  if (oldTracks !== undefined) {
    connection.conference.replaceTrack(oldTracks[0], newTrack)
  }
  const did_ = newTrack.getTrack().getSettings().deviceId
  const did:string = did_ ? did_ : ''
  if (newTrack.getType() === 'audio') {
    participants.local.devicePreference.audioInputDevice = did
  }else if (newTrack.getType() === 'video') {
    participants.local.devicePreference.videoInputDevice = did
  }
}
*/
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
