import {connection} from '@models/api'
import {manager as audioManager} from '@models/audio'
import participants from '@stores/participants/Participants'
import {JitsiLocalTrack} from 'lib-jitsi-meet'
import {reaction} from 'mobx'

reaction(() => participants.local.get().plugins.streamControl.muteAudio,
         (muteAudio) => {
           const track = participants.local.get().tracks.audio as JitsiLocalTrack
          //  const track = connection.conference?.getLocalAudioTrack()
           if (track) { muteAudio ? track.mute() : track.unmute() }
         },
)
reaction(() => participants.local.get().plugins.streamControl.muteVideo,
         (muteVideo) => {
           const track = connection.conference?.getLocalVideoTrack()
           if (track) {
             if (muteVideo) {
               track.mute().then(() => {
                 participants.local.get().tracks.avatar = undefined
               })
             }else {
               track.unmute().then(() => {
                 participants.local.get().tracks.avatar = track
               })
             }
           }
         },
)
