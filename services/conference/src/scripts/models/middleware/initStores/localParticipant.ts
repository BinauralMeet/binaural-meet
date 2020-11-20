import {connection} from '@models/api'
import {urlParameters} from '@models/url'
import {participantsStore} from '@stores/participants'
import {LocalParticipant} from '@stores/participants/LocalParticipant'
import {connect} from 'http2'
import {reaction} from 'mobx'

function applyUrlParameters(local: LocalParticipant) {
  local.loadInformationFromStorage()
  if (urlParameters.userName) { local.information.name = urlParameters.userName }
  local.useStereoAudio = urlParameters.monaural !== null ? true : false
  console.debug('URL audio', urlParameters.audio)
  local.plugins.streamControl.muteAudio =
    (urlParameters.muteMic === 'no' || urlParameters.muteMic === 'false') ? false : true
  console.debug('URL muteMic', urlParameters.muteMic)
  local.plugins.streamControl.muteVideo = urlParameters.muteCamera ? true : false
  console.debug('URL muteCamera', urlParameters.muteCamera)
  connection.conference._jitsiConference?.setStartMutedPolicy(
    {audio:local.plugins.streamControl.muteAudio, video: local.plugins.streamControl.muteVideo})
}

reaction(
  () => participantsStore.local.get(),
  applyUrlParameters,
  {
    fireImmediately: true,
  },
)
