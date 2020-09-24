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

reaction(() => sharedContents.localMainTracks, (newTracks) => {
/*  const added = diffSet(tracks, prevTracks)
  const removed = diffSet(prevTracks, tracks)
  if (added.size) { console.log('localMainTrack added', added) }
  if (removed.size) { console.log('localMainTrack removed', removed) }
  removed.forEach((track) => { connection.conference?.removeTrack(track) })
  added.forEach((track) => { connection.conference?.addTrack(track) })
  */
  const oldTracks = connection.conference.getLocalTracks().filter(t => t.isMainScreen())
  const added = diffSet(new Set(newTracks), new Set(oldTracks))
  const removed = diffSet(new Set(oldTracks), new Set(newTracks))

  for (const t of removed) {
    connection.conference.removeTrack(t)
    console.log(`${t} removed`)
  }
  connection.conference.addTracks(Array.from(added.values()))
})
