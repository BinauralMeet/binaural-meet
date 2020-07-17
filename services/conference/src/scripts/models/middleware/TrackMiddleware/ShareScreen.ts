import {connection} from '@models/api'
import {Tracks} from '@models/Participant'
import participants from '@stores/participants/Participants'
import {observe, reaction} from 'mobx'
import {MediaType, JitsiTrack} from 'lib-jitsi-meet'
import sharedContents from '@stores/sharedContents/SharedContents'

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


reaction(() => Array.from(participants.remote.values()).map(remote => remote.tracks.screen),
  (screens) => {
    const ss:JitsiTrack[] = []
    screens.forEach((s)=>{
      if (s) {
        ss.push(s)
      }
      sharedContents.mainTracks = ss
    })
    console.log('MainScreen = ', ss)
  }
)
