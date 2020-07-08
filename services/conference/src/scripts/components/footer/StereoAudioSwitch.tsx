import {useStore as useParticipantsStore} from '@hooks/ParticipantsStore'
import Fab from '@material-ui/core/Fab'
import {useObserver} from 'mobx-react-lite'
import React from 'react'

export const StereoAudioSwitch: React.FunctionComponent = () => {
  const participants = useParticipantsStore()
  const stereo = useObserver(() => participants.local.get().useStereoAudio)

  const switchStereo = () => {
    participants.local.get().useStereoAudio = !stereo
  }

  return <Fab onClick={switchStereo}>{stereo ? 'Stereo' : 'Mono'}</Fab>
}
StereoAudioSwitch.displayName = 'StereoAudioSwtich'
