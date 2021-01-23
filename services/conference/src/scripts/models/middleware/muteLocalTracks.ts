import {connection} from '@models/api'
import {manager as audioManager} from '@models/audio'
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
reaction(() => participants.local.plugins.streamControl.muteVideo,
         (muteVideo) => {
           const track = connection.conference.getLocalCameraTrack()
           if (track) {
             if (muteVideo) {
               connection.conference.removeTrack(track)
               participants.local.tracks.avatar = undefined
             }else {
               connection.conference.addTrack(track)
               participants.local.tracks.avatar = track
             }
           }
         },
)
