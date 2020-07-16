import {connection} from '@models/api'
import {LocalTracks} from '@models/Participant'
import participants from '@stores/participants/Participants'
import {observe, reaction} from 'mobx'
import {MediaType} from 'lib-jitsi-meet'

reaction(() => participants.local.get().tracks.screen,
  (screen) => {
    if (screen){
      console.log('add screen track')
      //  const tracks = connection.conference?.getLocalTracks(MediaType.VIDEO)
      //  if (tracks && tracks[0]) connection.conference?.removeTrack(tracks[0])
      connection.conference?.addTrack(screen)
    }else{
      console.log('remove screen track')
      const tracks = connection.conference?.getLocalTracks(MediaType.PRESENTER)
      if (tracks && tracks[0]) connection.conference?.removeTrack(tracks[0])
    }
  }
)


observe(participants.local.get().tracks, (change) => {
  console.log('observe called')
  if (change.type === 'update'){
    const newTracks = change.newValue as LocalTracks
    const oldTracks = change.newValue as LocalTracks
    if (oldTracks.screen){
      connection.conference?.removeTrack(oldTracks.screen)
    }
    if (newTracks.screen){
      connection.conference?.addTrack(newTracks.screen)
    }
  }
})
