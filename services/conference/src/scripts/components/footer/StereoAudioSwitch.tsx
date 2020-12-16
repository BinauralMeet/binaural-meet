import {useStore as useParticipantsStore} from '@hooks/ParticipantsStore'
import {Tooltip} from '@material-ui/core'
import HeadsetIcon from '@material-ui/icons/HeadsetMic'
import SpeakerIcon from '@material-ui/icons/Speaker'
import {useObserver} from 'mobx-react-lite'
import React from 'react'
import {FabMain} from './FabNoFocus'

export const StereoAudioSwitch: React.FC = () => {
  const participants = useParticipantsStore()
  const stereo = useObserver(() => participants.local.get().useStereoAudio)
  const switchStereo = () => {
    participants.local.get().useStereoAudio = !stereo
  }

  return <Tooltip
    title={
      <React.Fragment>
        {'Stereo headset'} <strong>{'without echo canceller'}</strong><br />{'/ Monaural speaker with echo canceller'}
      </React.Fragment>
    }>
    <span>
      <FabMain onClick={switchStereo}>
        {stereo ? <HeadsetIcon fontSize="large" /> : <SpeakerIcon fontSize="large" />}
      </FabMain>
    </span>
  </Tooltip>
}
StereoAudioSwitch.displayName = 'StereoAudioSwtich'
