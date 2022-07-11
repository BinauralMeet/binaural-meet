import {getNotificationPermission} from '@models/conference/Notification'
import {manager as audioManager} from '@models/audio'
import {urlParameters} from '@models/url'
import participants from '@stores/participants/Participants'
import {autorun} from 'mobx'
import {stopHolisticTrack, startHolisticTrack} from './mediapipeCamera'
import {stopFaceTrack, createLocalCamera} from './faceCamera'
import {MSTrack} from '@models/utils'
import {conference} from '@models/conference'

//  mic device selection
export function createLocalMic() {
  //  console.log(`createLocalMic() called`)
  const promise = new Promise<MSTrack>((resolutionFunc, rejectionFunc) => {
    const did = participants.local.devicePreference.audioInputDevice
    navigator.mediaDevices.getUserMedia({
      audio:{deviceId: did}
    }).then((ms)=>{
      const track = ms.getAudioTracks()[0]
      if (track){
        resolutionFunc({track, peer:participants.local.id, role:'avatar'})
      }
    }).catch(rejectionFunc)
  })

  return promise
}

//  mic mute and audio input device selection
function isMicMuted(){
  return participants.local.muteAudio || participants.local.physics.awayFromKeyboard ||
    !participants.localId || urlParameters.testBot !== null
}
autorun(() => {
  const did = participants.local.devicePreference.audioInputDevice
  //  console.log(`isMicMuted === ${isMicMuted()}`)
  if (isMicMuted()){
    conference.setLocalMicTrack(undefined).then(()=>{
      participants.local.audioLevel = 0
    })
  }else{
    const track = conference.getLocalMicTrack()
    if (track && track.deviceId === did) { return }
    createLocalMic().then((track)=>{
      if (isMicMuted()){
        track.track?.stop()
      }else{
        conference.setLocalMicTrack(track)
      }
    }).finally(getNotificationPermission)
  }
})


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
let didPrev:string|undefined=undefined
autorun(() => {
  const did = participants.local.devicePreference.videoInputDevice
  const faceTrack = participants.local.information.faceTrack
  if (isCameraMuted()) {
    stopHolisticTrack()
    stopFaceTrack()
    if (DELETE_TRACK){
      conference.setLocalCameraTrack(undefined).then(track => track?.track.stop())
    } else {
      const track = conference.getLocalCameraTrack()
      if (track) { conference.removeLocalTrack(track) }
    }
    didPrev = undefined
  }else{
    const isVrm = participants.local.information.avatarSrc.slice(-4) === '.vrm'
    if (isVrm){
      stopFaceTrack()
      if (did !== didPrev){
        startHolisticTrack()
        didPrev = did
      }
    }else{
      didPrev = undefined
      stopHolisticTrack()
      const track = conference.getLocalCameraTrack()
      if (track && track.deviceId === did) { return }
      createLocalCamera(faceTrack).then((track)=>{
        if (!isCameraMuted()){
          conference.setLocalCameraTrack(track)
        }else{
          track?.track.stop()
        }
      }).finally(getNotificationPermission)
    }
  }
})
