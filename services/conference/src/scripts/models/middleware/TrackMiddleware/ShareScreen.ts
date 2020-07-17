import {connection} from '@models/api'
import {Tracks} from '@models/Participant'
import participants from '@stores/participants/Participants'
import {observe, reaction} from 'mobx'
import {MediaType, JitsiLocalTrack} from 'lib-jitsi-meet'

reaction(() => participants.local.get().tracks.screen,
  (screen) => {
    if (screen){
      //  const tracks = connection.conference?.getLocalTracks(MediaType.VIDEO)
      //  if (tracks && tracks[0]) connection.conference?.removeTrack(tracks[0])
      connection.conference?.addTrack(screen)
      console.log('Screen track added')
    }else{
      const tracks = connection.conference?.getLocalTracks(MediaType.VIDEO)
      tracks?.forEach((track) => {
        if (track.isScreenSharing()){
          connection.conference?.removeTrack(tracks[0])
          console.log('Screen track removed')
        }
      })
    }
  }
)


observe(participants.local.get().tracks, (change) => {
  console.log('observe called')
  if (change.type === 'update'){
    const newTracks = change.newValue as Tracks<JitsiLocalTrack>
    const oldTracks = change.newValue as Tracks<JitsiLocalTrack>
    if (oldTracks.screen){
      connection.conference?.removeTrack(oldTracks.screen)
    }
    if (newTracks.screen){
      connection.conference?.addTrack(newTracks.screen)
    }
  }
})
