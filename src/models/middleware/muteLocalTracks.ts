import {connection} from '@models/api'
import {createLocalCamera} from '@models/middleware/chooseDevice'
import participants from '@stores/participants/Participants'
import {JitsiLocalTrack} from 'lib-jitsi-meet'
import {reaction} from 'mobx'

reaction(() => participants.local.plugins.streamControl.muteAudio,
         (muteAudio) => {
           const track = participants.local.tracks.audio as JitsiLocalTrack
           if (track) { muteAudio ? track.mute() : track.unmute() }
           if (muteAudio) {
             participants.local.tracks.audioLevel = 0
           }
         },
)
const DELETE_TRACK = true
reaction(() => participants.local.plugins.streamControl.muteVideo, (muteVideo) => {
  if (muteVideo) {
    participants.local.tracks.avatar = undefined
    const track = connection.conference.getLocalCameraTrack()
    if (DELETE_TRACK) {
      connection.conference.setLocalCameraTrack(undefined).then(track => track?.dispose())
    }else {
      if (track) {
        connection.conference.removeTrack(track)
      }
    }
  }else {
    if (DELETE_TRACK) {
      createLocalCamera().then((track) => {
        participants.local.tracks.avatar = track
      })
    }else {
      const track = connection.conference.getLocalCameraTrack()
      if (track) {
        connection.conference.addTrack(track)
        participants.local.tracks.avatar = track
      }
    }
  }
})
