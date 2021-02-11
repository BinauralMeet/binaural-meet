import {connection} from '@models/api'
import {manager as audioManager} from '@models/audio'
import {urlParameters} from '@models/url'
import participants from '@stores/participants/Participants'
import JitsiMeetJS, {JitsiLocalTrack} from 'lib-jitsi-meet'
import {autorun} from 'mobx'

autorun(() => {
  const did = participants.local.devicePreference.audioInputDevice
  if (participants.localId && urlParameters.testBot === null) {
    const track = connection.conference.getLocalMicTrack()
    if (track && track.getDeviceId() === did) { return }
    JitsiMeetJS.createLocalTracks({devices:['audio'], micDeviceId: did}).then(
      (tracks: JitsiLocalTrack[]) => { connection.conference.setLocalMicTrack(tracks[0]) },
    )
  }
})

// config.js
declare const config:any                  //  from ../../config.js included from index.html
export function createLocalCamera() {
  const promise = new Promise<JitsiLocalTrack>((resolutionFunc, rejectionFunc) => {
    const did = participants.local.devicePreference.videoInputDevice
    JitsiMeetJS.createLocalTracks({devices:['video'],
      constraints: config.rtc.videoConstraints, cameraDeviceId: did}).then(
      (tracks: JitsiLocalTrack[]) => {
        connection.conference.setLocalCameraTrack(tracks[0])
        resolutionFunc(tracks[0])
      },
    ).catch(rejectionFunc)
  })

  return promise
}
autorun(() => {
  const did = participants.local.devicePreference.videoInputDevice
  if (participants.localId && urlParameters.testBot === null) {
    const track = connection.conference.getLocalCameraTrack()
    if (track && track.getDeviceId() === did) { return }
    createLocalCamera()
  }
})

autorun(() => {
  const did = participants.local.devicePreference.audioOutputDevice
  if (did) {
    audioManager.setAudioOutput(did)
  }
})

