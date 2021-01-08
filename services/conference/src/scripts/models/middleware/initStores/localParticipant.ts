import {urlParameters} from '@models/url'
import {participantsStore} from '@stores/participants'
import {LocalParticipant} from '@stores/participants/LocalParticipant'
import {reaction} from 'mobx'

function applyUrlParameters(local: LocalParticipant) {
  local.loadInformationFromStorage()
  if (urlParameters.name) { local.information.name = urlParameters.name }
  local.useStereoAudio = urlParameters.headphone !== null ? true : false
  //  console.debug('URL headphone', urlParameters.headphone)
  local.plugins.streamControl.muteAudio = urlParameters.muteMic !== null ? true : false
  //  console.debug('URL muteMic', urlParameters.muteMic)
  local.plugins.streamControl.muteVideo = urlParameters.muteCamera !== null ? true : false
  //  console.debug('URL muteCamera', urlParameters.muteCamera)
  local.loadMuteStatusFromStorage()
  local.loadPhysicsFromStorage()
}

reaction(
  () => participantsStore.local,
  applyUrlParameters,
  {
    fireImmediately: true,
  },
)
