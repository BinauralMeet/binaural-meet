import {connection} from '@models/api'
import participants from '@stores/participants/Participants'
import sharedContents from '@stores/sharedContents/SharedContents'
import {diffSet} from '@stores/utils'
import {JitsiLocalTrack} from 'lib-jitsi-meet'
import {configure, reaction} from 'mobx'

reaction(() => sharedContents.remoteMainTracks, (remoteMainTracks) => {
  if (sharedContents.localMainTracks.size) {
    const remotePids = Array.from(remoteMainTracks.keys())
    if (remotePids.length && remotePids[remotePids.length - 1] !== participants.localId) {
      //  remote pid is larger and I have to stop screen shareing
      sharedContents.localMainTracks.forEach((track) => { track.getTrack().stop() })
    }
  }
})

reaction(() => sharedContents.localMainTracks, (tracks) => {
/*  const added = diffSet(tracks, prevTracks)
  const removed = diffSet(prevTracks, tracks)
  if (added.size) { console.log('localMainTrack added', added) }
  if (removed.size) { console.log('localMainTrack removed', removed) }
  removed.forEach((track) => { connection.conference?.removeTrack(track) })
  added.forEach((track) => { connection.conference?.addTrack(track) })
  */
  const oldVideoTracks = connection.conference?.getLocalTracks('video')
  oldVideoTracks?.forEach(t => t.isMainScreen() &&  connection.conference?.removeTrack(t))
  const oldAudioTracks = connection.conference?.getLocalTracks('audio')
  oldAudioTracks?.forEach(t => t.isMainScreen() &&  connection.conference?.removeTrack(t))

  tracks.forEach((track) => { connection.conference?.addTrack(track) })
})
