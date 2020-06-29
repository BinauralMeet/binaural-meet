import {connection} from '@models/api'
import {AppLevel as IAppLevel} from '@models/AppLevel'
import participants from '@stores/Participants'
import JitsiParticipant from 'lib-jitsi-meet/JitsiParticipant'
import JitsiLocalTrack from 'lib-jitsi-meet/modules/RTC/JitsiLocalTrack'
import {default as JitsiTrack, MediaType} from 'lib-jitsi-meet/modules/RTC/JitsiTrack'
import {observable, reaction, when} from 'mobx'
import {Store} from './utils'

export class AppLevel implements Store<IAppLevel>{
  @observable micOn = true
  @observable cameraOn = true
  @observable screenShareOn = false
}

const appLevel = new AppLevel()
export default appLevel


const micReaction = reaction(() => appLevel.micOn,
                             (micOn) => {
                               const tracks = connection.localTracks
                               for (const track of tracks) {
                                 if (track.getType() === 'audio') {
                                   micOn ? track.unmute() : track.mute()
                                   console.log('mic ', micOn)
                                 }
                               }
                             },
)
const camerReaction = reaction(() => appLevel.cameraOn,
                               (cameraOn) => {
                                 const tracks = connection.localTracks
                                 for (const track of tracks) {
                                   if (track.getType() === 'video') {
                                     cameraOn ? track.unmute() : track.mute()
                                     const stream = participants.local.get().stream.avatarStream
                                     if (stream) { stream.getTracks()[0].enabled = cameraOn }
                                     console.log('camera ', cameraOn)
                                   }
                                 }
                               },
)
