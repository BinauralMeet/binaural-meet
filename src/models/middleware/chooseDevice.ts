import {connection} from '@models/api'
import { getNotificationPermission } from '@models/api/Notification'
import {manager as audioManager} from '@models/audio'
import {urlParameters} from '@models/url'
import participants from '@stores/participants/Participants'
import JitsiMeetJS, {JitsiLocalTrack} from 'lib-jitsi-meet'
import {autorun} from 'mobx'

// config.js
declare const config:any                  //  from ../../config.js included from index.html

//  mic device selection
export function createLocalMic() {
  const promise = new Promise<JitsiLocalTrack>((resolutionFunc, rejectionFunc) => {
    const did = participants.local.devicePreference.audioInputDevice
    JitsiMeetJS.createLocalTracks({devices:['audio'],
      constraints: config.rtc.audioConstraints, micDeviceId: did}).then(
      (tracks: JitsiLocalTrack[]) => {
        connection.conference.setLocalMicTrack(tracks[0])
        resolutionFunc(tracks[0])
      },
    ).catch(rejectionFunc)
  })

  return promise
}

//  Mute reaction for mic
/*
const DELETE_MIC_TRACK = false
if (DELETE_MIC_TRACK){
  autorun(() => {
    const did = participants.local.devicePreference.audioInputDevice
    const muted = participants.local.muteAudio|| participants.local.awayFromKeyboard
    if (participants.localId && !muted && urlParameters.testBot === null) {
      const track = connection.conference.getLocalMicTrack()
      if (track && track.getDeviceId() === did) { return }
      createLocalMic().finally(getNotificationPermission)
    }else{
      connection.conference.setLocalMicTrack(undefined).then(track => track?.dispose())
    }
    if (participants.local.muteAudio) {
      participants.local.tracks.audioLevel = 0
    }
  })
}else{
  autorun(() => {
    const muteAudio = participants.local.muteAudio
     || participants.local.awayFromKeyboard
    const track = participants.local.tracks.audio as JitsiLocalTrack
    if (track) { muteAudio ? track.mute() : track.unmute() }
    if (muteAudio) {
      participants.local.tracks.audioLevel = 0
    }
  })
}
*/
//  mic mute and audio input device selection
const DELETE_MIC_TRACK = true
autorun(() => {
  const did = participants.local.devicePreference.audioInputDevice
  const muted = participants.local.muteAudio || participants.local.physics.awayFromKeyboard
  if (participants.localId && !muted && urlParameters.testBot === null) {
    const track = connection.conference.getLocalMicTrack()
    if (track && track.getDeviceId() === did) { return }
    createLocalMic().finally(getNotificationPermission)
  }else{
    if (DELETE_MIC_TRACK){
      connection.conference.setLocalMicTrack(undefined).then(track => {
        track?.dispose()
        participants.local.audioLevel = 0
      })
    } else {
      const track = connection.conference.getLocalMicTrack()
      if (track) { connection.conference.removeTrack(track) }
      participants.local.audioLevel = 0
    }
  }
})

/*
//  microphone or audio input device update
autorun(() => {
  const did = participants.local.devicePreference.audioInputDevice
  const muted = participants.local.muteAudio
  if (participants.localId && !muted && urlParameters.testBot === null) {
    const track = connection.conference.getLocalMicTrack()
    if (track && track.getDeviceId() === did) { return }
    createLocalMic().finally(getNotificationPermission)
  }
})
*/

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
  const muted = participants.local.muteVideo
    || participants.local.physics.awayFromKeyboard
  if (participants.localId && !muted && urlParameters.testBot === null) {
    const track = connection.conference.getLocalCameraTrack()
    if (track && track.getDeviceId() === did) { return }
    createLocalCamera().finally(getNotificationPermission)
  }else{
    if (DELETE_TRACK){
      connection.conference.setLocalCameraTrack(undefined).then(track => track?.dispose())
    } else {
      const track = connection.conference.getLocalCameraTrack()
      if (track) { connection.conference.removeTrack(track) }
    }
  }
})
