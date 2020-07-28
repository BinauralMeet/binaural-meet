import {urlParameters} from '@models/url'
import {participantsStore} from '@stores/participants'
import {LocalParticipant} from '@stores/participants/LocalParticipant'
import {reaction} from 'mobx'

function applyUrlParameters(local: LocalParticipant) {
  local.loadInformationFromStorage()
  local.useStereoAudio = urlParameters.audio === 'mono' ? false : true
  console.log('audio parameter', urlParameters.audio)
}

reaction(
  () => participantsStore.local.get(),
  applyUrlParameters,
  {
    fireImmediately: true,
  },
)
