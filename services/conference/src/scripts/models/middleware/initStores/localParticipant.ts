import {urlParameters} from '@models/url'
import {participantsStore} from '@stores/participants'
import {LocalParticipant} from '@stores/participants/LocalParticipant'
import {reaction} from 'mobx'

function applyUrlParameters(local: LocalParticipant) {
  local.loadInformationFromStorage()
  if (urlParameters.userName) { local.information.name = urlParameters.userName }
  local.useStereoAudio = urlParameters.audio === 'stereo' ? true : false
  console.log('audio parameter', urlParameters.audio)
}

reaction(
  () => participantsStore.local.get(),
  applyUrlParameters,
  {
    fireImmediately: true,
  },
)
