import {manager as audioManager} from '@models/audio'
import participants from '@stores/participants/Participants'
import {autorun} from 'mobx'

//  headphone or audio output device update
let timeout:NodeJS.Timeout|undefined
autorun(() => {
  if (timeout){
    clearTimeout(timeout)
    timeout = undefined
  }
  const setAudioSink = () => {
    const did = participants.local.devicePreference.audiooutput
    if (did && did !== audioManager.getAudioOutput()) {
      audioManager.setAudioOutput(did)
      if (did !== audioManager.getAudioOutput()){
        timeout = setTimeout(setAudioSink, 3000)
      }
    }
  }
  setAudioSink()
})
