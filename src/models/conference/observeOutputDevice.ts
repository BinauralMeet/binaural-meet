import {manager as audioManager} from '@models/audio'
import { playbackAudioDebug } from '@models/utils/playbackAudioDebug'
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
      playbackAudioDebug('observeOutputDevice setAudioSink', {
        did,
        currentOutput: audioManager.getAudioOutput(),
      })
      audioManager.setAudioOutput(did).then(() => {
        playbackAudioDebug('observeOutputDevice setAudioSink resolved', {
          did,
          currentOutput: audioManager.getAudioOutput(),
        })
        if (did !== audioManager.getAudioOutput()){
          timeout = window.setTimeout(setAudioSink, 3000)
        }
      })
    }
  }
  setAudioSink()
})
