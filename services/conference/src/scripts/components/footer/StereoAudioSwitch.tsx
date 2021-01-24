import {useStore as useParticipantsStore} from '@hooks/ParticipantsStore'
import {Tooltip} from '@material-ui/core'
import Container from '@material-ui/core/Container'
import Grid from '@material-ui/core/Grid'
import Popover from '@material-ui/core/Popover'
import {makeStyles} from '@material-ui/core/styles'
import Switch from '@material-ui/core/Switch'
import HeadsetIcon from '@material-ui/icons/HeadsetMic'
import SpeakerIcon from '@material-ui/icons/Speaker'
import participants from '@stores/participants/Participants'
import {useObserver} from 'mobx-react-lite'
import React from 'react'
import {FabMain} from './FabNoFocus'

export const SoundLocalizationSetting: React.FC<{}> = () => {
  const soundLocalizationBase = useObserver(() => participants.local.soundLocalizationBase)

  return <Container>
    <Grid component="label" container={true} alignItems="center" spacing={1}>
      <Grid item={true}>User (top is front)</Grid>
      <Grid item={true}>
        <Switch checked={soundLocalizationBase === 'avatar'} onChange={() => {
          participants.local.soundLocalizationBase = soundLocalizationBase === 'avatar' ? 'user' : 'avatar'
          participants.local.saveMediaSettingsToStorage(true)
        }} name="soundLoc" />
      </Grid>
      <Grid item={true}>Avatar (avatar's direction)</Grid>
    </Grid>
  </Container>
}
SoundLocalizationSetting.displayName = 'SoundLocalizationSetting'

const useStyles = makeStyles({
  button:{
    paddingTop:20,
  },
})


export const StereoAudioSwitch: React.FC = () => {
  const participants = useParticipantsStore()
  const stereo = useObserver(() => participants.local.useStereoAudio)
  const [button, setButton] = React.useState<Element|null>(null)

  const switchStereo = () => {
    participants.local.useStereoAudio = !stereo
    participants.local.saveMediaSettingsToStorage(true)
  }

  const classes = useStyles()

  return <>
    <Tooltip placement="top-start" arrow={true}
      title={
        <React.Fragment>
          {'Stereo headset'} <strong>{'without echo canceller'}</strong><br />{'/ Monaural speaker with echo canceller'}
        </React.Fragment>
      }>
      <span className={classes.button}>
        <FabMain onClick={switchStereo} color = {stereo ? 'secondary' : 'primary'}
          onClickMore = {stereo ? (ev) => { setButton(ev.currentTarget) } : undefined} >
          {stereo ? <HeadsetIcon fontSize="large" />  :
          <SpeakerIcon fontSize="large" />}
        </FabMain>
      </span>
    </Tooltip>
    <Popover open={Boolean(button)} onClose={() => setButton(null)}
      anchorEl={button} anchorOrigin={{vertical:'top', horizontal:'left'}}
      anchorReference = "anchorEl" >
      <div style={{padding:20}}>
        Sound localization based on <br />
        <SoundLocalizationSetting />
      </div>
    </Popover>
  </>
}
StereoAudioSwitch.displayName = 'StereoAudioSwtich'
