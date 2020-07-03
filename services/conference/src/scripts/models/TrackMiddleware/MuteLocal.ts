import {reaction} from 'mobx'
import {connection} from '@models/api'
import participants from '@stores/participants/Participants'

reaction(() => participants.local.get().plugins.streamControl.muteAudio,
(muteAudio) => {
  const tracks = connection.localTracks
  for (const track of tracks) {
    if (track.getType() === 'audio') {
      muteAudio ? track.mute() : track.unmute()
    }
  }
},
)
reaction(() => participants.local.get().plugins.streamControl.muteVideo,
  (muteVideo) => {
    const tracks = connection.localTracks
    for (const track of tracks) {
      if (track.getType() === 'video') {
        muteVideo ? track.mute() : track.unmute()
      }
    }
  },
)
