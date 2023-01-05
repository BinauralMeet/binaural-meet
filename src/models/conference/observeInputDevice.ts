import {getNotificationPermission} from '@models/conference/Notification'
import {urlParameters} from '@models/url'
import participants from '@stores/participants/Participants'
import {IReactionDisposer, autorun} from 'mobx'
import {stopMpTrack, startMpTrack} from './mediapipeCamera'
import {stopFaceTrack, createLocalCamera} from './faceCamera'
import {MSTrack} from '@models/utils'
import {conference} from '@models/conference'

//  mic device selection
export function createLocalMic() {
  //  console.log(`createLocalMic() called`)
  const promise = new Promise<MSTrack>((resolutionFunc, rejectionFunc) => {
    const did = participants.local.devicePreference.audioinput
    navigator.mediaDevices.getUserMedia({
      audio:{deviceId: did}
    }).then((ms)=>{
      const track = ms.getAudioTracks()[0]
      if (track){
        resolutionFunc({track, peer:participants.local.id, role:'avatar', deviceId:did})
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
//  camera mute and camera device update
const DELETE_TRACK = true
function isCameraMuted(){
  return participants.local.muteVideo || participants.local.physics.awayFromKeyboard ||
    !participants.localId || urlParameters.testBot !== null
}

const disposes:IReactionDisposer[] = []
export function inputChangeObservationStart(){
  disposes.push(autorun(() => {
    const did = participants.local.devicePreference.audioinput
    //  console.log(`isMicMuted === ${isMicMuted()}`)
    if (isMicMuted()){
      conference.setLocalMicTrack(undefined).then(()=>{
        participants.local.audioLevel = 0
      })
    }else{
      const track = conference.getLocalMicTrack()
      if (track && track.deviceId === did) { return }
      createLocalMic().then((newTrack)=>{
        if (isMicMuted()){
          newTrack.track?.stop()
        }else{
          conference.setLocalMicTrack(newTrack)
        }
      }).finally(getNotificationPermission)
    }
  }))
  disposes.push(autorun(() => {
    const did = participants.local.devicePreference.videoinput
    const faceTrack = participants.local.information.faceTrack
    if (isCameraMuted()) {
      stopMpTrack()
      stopFaceTrack()
      if (DELETE_TRACK){
        conference.setLocalCameraTrack(undefined).then(track => track?.track.stop())
      } else {
        const track = conference.getLocalCameraTrack()
        if (track) { conference.removeLocalTrack(true, track) }
      }
    }else{
      const isVrm = participants.local.information.avatarSrc.slice(-4) === '.vrm'
      if (isVrm){
        stopFaceTrack()
        startMpTrack(!faceTrack)
      }else{
        stopMpTrack()
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
  }))
}
export function inputChangeObservationStop(){
  for(const d of disposes){ d() }
  disposes.length = 0
}
