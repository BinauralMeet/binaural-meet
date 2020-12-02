import {connection} from '@models/api'
import {urlParameters} from '@models/url'
import {participantsStore} from '@stores/participants'
import {LocalParticipant} from '@stores/participants/LocalParticipant'
import {connect} from 'http2'
import {reaction} from 'mobx'

function applyUrlParameters(local: LocalParticipant) {
  local.loadInformationFromStorage()
  if (urlParameters.userName) { local.information.name = urlParameters.userName }
  local.useStereoAudio = urlParameters.headphone !== null ? true : false
  console.debug('URL headphone', urlParameters.headphone)
  local.plugins.streamControl.muteAudio = urlParameters.muteMic !== null ? true : false
  console.debug('URL muteMic', urlParameters.muteMic)
  local.plugins.streamControl.muteVideo = urlParameters.muteCamera !== null ? true : false
  console.debug('URL muteCamera', urlParameters.muteCamera)
}

reaction(
  () => participantsStore.local.get(),
  applyUrlParameters,
  {
    fireImmediately: true,
  },
)
