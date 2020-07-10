import {connection} from '@models/api'
import {manager as audioManager} from '@models/audio'
import participants from '@stores/participants/Participants'
import {reaction} from 'mobx'

reaction(() => participants.local.get().plugins.streamControl.muteAudio,
         (muteAudio) => {
           const track = connection.conference?.getLocalAudioTrack()
           if (track) { muteAudio ? track.mute() : track.unmute() }
         },
)
reaction(() => participants.local.get().plugins.streamControl.muteVideo,
         (muteVideo) => {
           const track = connection.conference?.getLocalVideoTrack()
           if (track) { muteVideo ? track.mute() : track.unmute() }
         },
)
