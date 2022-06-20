import {connection} from '@models/api'
import {getNotificationPermission} from '@models/api/Notification'
import {manager as audioManager} from '@models/audio'
import {urlParameters} from '@models/url'
import participants from '@stores/participants/Participants'
import {autorun} from 'mobx'
import {createLocalCamera} from './faceCamera'
import {MSTrack} from '@models/utils'

// config.js
declare const config:any                  //  from ../../config.js included from index.html

//  mic device selection
export function createLocalMic() {
  console.log(`createLocalMic() called`)
  const promise = new Promise<MSTrack>((resolutionFunc, rejectionFunc) => {
    const did = participants.local.devicePreference.audioInputDevice
    navigator.mediaDevices.getUserMedia({
      audio:{deviceId: did}
    }).then((ms)=>{
      const track = ms.getAudioTracks()[0]
      if (track){
        resolutionFunc({track, peer:participants.local.id, role:'mic'})
      }
    }).catch(rejectionFunc)
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
function isMicMuted(){
  return participants.local.muteAudio || participants.local.physics.awayFromKeyboard ||
    !participants.localId || urlParameters.testBot !== null
}
autorun(() => {
  const did = participants.local.devicePreference.audioInputDevice
  if (isMicMuted()){
    connection.conference.setLocalMicTrack(undefined).then(track => {
      track?.track.stop()
      participants.local.audioLevel = 0
    })
  }else{
    const track = connection.conference.getLocalMicTrack()
    if (track && track.deviceId === did) { return }
    createLocalMic().then((track)=>{
      if (isMicMuted()){
        track.track?.stop()
      }else{
        connection.conference.setLocalMicTrack(track)
      }
    }).finally(getNotificationPermission)
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

//  camera mute and camera device update
const DELETE_TRACK = true
function isCameraMuted(){
  return participants.local.muteVideo || participants.local.physics.awayFromKeyboard ||
    !participants.localId || urlParameters.testBot !== null
}
autorun(() => {
  const did = participants.local.devicePreference.videoInputDevice
  const faceTrack = participants.local.information.faceTrack
  if (isCameraMuted()) {
    if (DELETE_TRACK){
      connection.conference.setLocalCameraTrack(undefined).then(track => track?.track.stop())
    } else {
      const track = connection.conference.getLocalCameraTrack()
      if (track) { connection.conference.removeLocalTrack(track) }
    }
  }else{
    const track = connection.conference.getLocalCameraTrack()
    if (track && track.deviceId === did) { return }
    createLocalCamera(faceTrack).then((track)=>{
      if (!isCameraMuted()){
        connection.conference.setLocalCameraTrack(track)
      }else{
        track?.track.stop()
      }
    }).finally(getNotificationPermission)
  }
})
