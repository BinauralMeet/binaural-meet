import {connection} from '@models/api'
import participants from '@stores/participants/Participants'
import sharedContents from '@stores/sharedContents/SharedContents'
import {reaction} from 'mobx'

reaction(() => participants.local.get().tracks.screen,
         (screen) => {
           sharedContents.mainTrack = screen
           if (screen) {
             connection.conference?.addTrack(screen)
             console.log('Screen track added')
           }else {
             const tracks = connection.conference?.getLocalTracks('video')
             tracks?.forEach((track) => {
               if (track.isScreenSharing()) {
                 connection.conference?.removeTrack(tracks[0])
                 console.log('Screen track removed')
               }
             })
           }
         },
)


reaction(() => Array.from(participants.remote.values()).map(remote => remote.tracks.screen),
         (screens) => {
           sharedContents.mainTrack = screens.find(s => s)
           console.log('MainScreen = ', sharedContents.mainTrack)
         },
)
