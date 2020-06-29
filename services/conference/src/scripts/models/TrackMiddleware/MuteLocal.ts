import {reaction} from 'mobx'
import {default as appLevel} from '@stores/AppLevel'
import {connection} from '@models/api'
import participants from '@stores/participants/Participants'

reaction(() => appLevel.micOn,
(micOn) => {
  const tracks = connection.localTracks
  for (const track of tracks) {
    if (track.getType() === 'audio') {
      micOn ? track.unmute() : track.mute()
    }
  }
},
)
reaction(() => appLevel.cameraOn,
  (cameraOn) => {
    const tracks = connection.localTracks
    for (const track of tracks) {
      if (track.getType() === 'video') {
        cameraOn ? track.unmute() : track.mute()
        participants.local.get().plugins.streamControl.muteVideo = !cameraOn
      }
    }
  },
)
