import {reaction} from 'mobx'
import {connection} from '@models/api'
import participants from '@stores/participants/Participants'
import JitsiMeetJS, {JitsiValues, JitsiLocalTrack, JitsiTrackOptions} from 'lib-jitsi-meet'

function replaceTrack(newTrack:JitsiLocalTrack){
  const oldTrack = connection.localTracks.reduce((a:JitsiLocalTrack|null, c:JitsiLocalTrack) => {
    if (a) return a;
    if (c.getType() === newTrack.getType()) return c
    return null
  }, null)
  connection.conference?.replaceTrack(oldTrack, newTrack)
}

reaction(() => participants.local.get().plugins.streamControl.audioInputDevice,
  (did) => {
    JitsiMeetJS.createLocalTracks({ devices:['audio'], micDeviceId: did }).then(
      (tracks: JitsiLocalTrack[]) =>{ replaceTrack(tracks[0]) }
    )
  }
)

reaction(() => participants.local.get().plugins.streamControl.videoInputDevice,
  (did) => {
    JitsiMeetJS.createLocalTracks({ devices:['video'], micDeviceId: did }).then(
      (tracks: JitsiLocalTrack[]) =>{ replaceTrack(tracks[0]) }
    )
  }
)