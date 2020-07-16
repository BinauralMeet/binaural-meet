import {useStore as useParticipantsStore} from '@hooks/ParticipantsStore'
import {Tooltip} from '@material-ui/core'
import Fab from '@material-ui/core/Fab'
import HeadsetIcon from '@material-ui/icons/HeadsetMic'
import SpeakerIcon from '@material-ui/icons/Speaker'
import {useObserver} from 'mobx-react-lite'
import React from 'react'

export interface StereoAudioSwitchProps{
  className?: string
}

export const StereoAudioSwitch: React.FunctionComponent<StereoAudioSwitchProps> = (props:StereoAudioSwitchProps) => {
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
    <Fab {...props} size="small" onClick={switchStereo}>{stereo ? <HeadsetIcon /> : <SpeakerIcon />}</Fab>
  </Tooltip>
}
StereoAudioSwitch.displayName = 'StereoAudioSwtich'
