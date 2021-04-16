import {connection} from '@models/api'
import {manager as audioManager} from '@models/audio'
import {urlParameters} from '@models/url'
import participants from '@stores/participants/Participants'
import JitsiMeetJS, {JitsiLocalTrack} from 'lib-jitsi-meet'
import {autorun, reaction} from 'mobx'

// config.js
declare const config:any                  //  from ../../config.js included from index.html

//  Mute reaction for audio
reaction(() => participants.local.plugins.streamControl.muteAudio,
         (muteAudio) => {
           const track = participants.local.tracks.audio as JitsiLocalTrack
           if (track) { muteAudio ? track.mute() : track.unmute() }
           if (muteAudio) {
             participants.local.tracks.audioLevel = 0
           }
         },
)

//  microphone or audio input device update
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

//  headphone or audio output device update
autorun(() => {
  const did = participants.local.devicePreference.audioOutputDevice
  if (did) {
    audioManager.setAudioOutput(did)
  }
})

//  camera device selection
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

//  camera mute and camera device update
const DELETE_TRACK = true
autorun(() => {
  const did = participants.local.devicePreference.videoInputDevice
  const muted = participants.local.plugins.streamControl.muteVideo
  if (participants.localId && !muted && urlParameters.testBot === null) {
    const track = connection.conference.getLocalCameraTrack()
    if (track && track.getDeviceId() === did) { return }
    createLocalCamera()
  }else{
    if (DELETE_TRACK){
      connection.conference.setLocalCameraTrack(undefined).then(track => track?.dispose())
    } else {
      const track = connection.conference.getLocalCameraTrack()
      if (track) { connection.conference.removeTrack(track) }
    }
  }
})
