import {connection} from '@models/api'
import {manager as audioManager} from '@models/audio'
import participants from '@stores/participants/Participants'
import {JitsiLocalTrack} from 'lib-jitsi-meet'
import {reaction} from 'mobx'

reaction(() => participants.local.get().plugins.streamControl.muteAudio,
         (muteAudio) => {
           const track = participants.local.get().tracks.audio as JitsiLocalTrack
           if (track) { muteAudio ? track.mute() : track.unmute() }
           if (muteAudio) {
             participants.local.get().tracks.audioLevel = 0
           }
         },
)
reaction(() => participants.local.get().plugins.streamControl.muteVideo,
         (muteVideo) => {
           const track = connection.conference.getLocalCameraTrack()
           if (track) {
             if (muteVideo) {
               connection.conference.removeTrack(track)
               participants.local.get().tracks.avatar = undefined
             }else {
               connection.conference.addTrack(track)
               participants.local.get().tracks.avatar = track
             }
           }
         },
)
