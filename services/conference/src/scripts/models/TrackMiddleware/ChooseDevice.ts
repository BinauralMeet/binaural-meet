import {reaction} from 'mobx'
import {connection} from '@models/api'
import participants from '@stores/participants/Participants'
import JitsiMeetJS, {JitsiValues, JitsiLocalTrack, JitsiTrackOptions} from 'lib-jitsi-meet'

function replaceTrack(newTrack:JitsiLocalTrack){
  const oldTracks = connection.conference?.getLocalTracks(newTrack.getType())
  if (oldTracks !== undefined){
    connection.conference?.replaceTrack(oldTracks[0], newTrack)
  }
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
    JitsiMeetJS.createLocalTracks({ devices:['video'], cameraDeviceId: did }).then(
      (tracks: JitsiLocalTrack[]) =>{
        replaceTrack(tracks[0])

//  This does not work at all
//  participants.local.get().stream.avatarStream = new MediaStream([tracks[0].getTrack()])

      //  This works first time.
        participants.local.get().stream.avatarStream?.getTracks().forEach( (tr) => {
          console.log("RemoveTrack", tr)
          participants.local.get().stream.avatarStream?.removeTrack(tr)
        })
        participants.local.get().stream.avatarStream?.addTrack(tracks[0].getTrack())
        console.log("AddTrack", tracks[0].getTrack())
        console.log("Result", participants.local.get().stream.avatarStream?.getTracks())
      }
    )
  }
)