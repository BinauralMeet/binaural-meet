import {default as sharedContents} from '@stores/sharedContents/SharedContents'
import {JitsiLocalTrack} from 'lib-jitsi-meet'

export function shareMainScreenStream(tracks: JitsiLocalTrack[]) {
  console.log('start sharing screen of ', tracks)

  sharedContents.localMainTracks = new Set(tracks)

  if (tracks.length){
    tracks[0].getTrack().onended = () => {
      console.log('stop sharing screen of ', tracks[0])
      sharedContents.localMainTracks = new Set()
    }
  }
}
