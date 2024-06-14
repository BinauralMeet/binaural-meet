import {manager as audioManager} from '@models/audio'
import participants from '@stores/participants/Participants'
import {autorun} from 'mobx'

//  headphone or audio output device update
let timeout = 0
autorun(() => {
  //console.log('autorun for audiooutput called.')
  if (timeout){
    window.clearTimeout(timeout)
    timeout = 0
  }
  const setAudioSink = () => {
    const did = participants.local.devicePreference.audiooutput
    if (did){
      audioManager.setAudioOutput(did)
      if (did !== audioManager.getAudioOutput()){
        timeout = window.setTimeout(setAudioSink, 3000)
      }
    }
  }
  setAudioSink()
})
