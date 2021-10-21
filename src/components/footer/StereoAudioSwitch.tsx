import {BMProps} from '@components/utils'
import Container from '@material-ui/core/Container'
import Grid from '@material-ui/core/Grid'
import Popover from '@material-ui/core/Popover'
import Switch from '@material-ui/core/Switch'
import HeadsetIcon from '@material-ui/icons/HeadsetMic'
import SpeakerIcon from '@material-ui/icons/Speaker'
import {useTranslation} from '@models/locales'
import {isChromium} from '@models/utils'
import participants from '@stores/participants/Participants'
import {useObserver} from 'mobx-react-lite'
import React from 'react'
import {FabWithTooltip} from './FabEx'

export const SoundLocalizationSetting: React.FC<{}> = () => {
  const soundLocalizationBase = useObserver(() => participants.local.soundLocalizationBase)
  const {t} = useTranslation()

  return <Container>
    <Grid component="label" container={true} alignItems="center" spacing={1}>
      <Grid item={true}>{t('slUser')}</Grid>
      <Grid item={true}>
        <Switch checked={soundLocalizationBase === 'avatar'} onChange={() => {
          participants.local.soundLocalizationBase = soundLocalizationBase === 'avatar' ? 'user' : 'avatar'
          participants.local.saveMediaSettingsToStorage()
        }} name="soundLoc" />
      </Grid>
      <Grid item={true}>{t('slAvatar')}</Grid>
    </Grid>
  </Container>
}
SoundLocalizationSetting.displayName = 'SoundLocalizationSetting'


export const StereoAudioSwitch: React.FC<BMProps&{size?: number, iconSize:number}> = (props) => {
  const participants = props.stores.participants
  const stereo = useObserver(() => participants.local.useStereoAudio)
  const [button, setButton] = React.useState<Element|null>(null)

  const switchStereo = () => {
    participants.local.useStereoAudio = !stereo
    participants.local.saveMediaSettingsToStorage()
  }

  const {t} = useTranslation()

  return <>
    <FabWithTooltip size={props.size} title={
        <>
          {isChromium ? t('headphoneL1Chrome') : t('headphoneL1')} <br />
          {t('headphoneL2')}
        </>}
      onClick={switchStereo} color = {stereo ? 'secondary' : 'primary'}
      onClickMore = {stereo ? (ev) => { setButton(ev.currentTarget) } : undefined} >
      {stereo ? <HeadsetIcon style={{width:props.iconSize, height:props.iconSize}} />  :
      <SpeakerIcon style={{width:props.iconSize, height:props.iconSize}} /> }
    </FabWithTooltip>
    <Popover open={Boolean(button)} onClose={() => setButton(null)}
      anchorEl={button} anchorOrigin={{vertical:'top', horizontal:'left'}}
      anchorReference = "anchorEl" >
      <div style={{padding:20}}>
        {t('soundLocalizationBasedOn')} <br />
        <SoundLocalizationSetting />
      </div>
    </Popover>
  </>
}
StereoAudioSwitch.displayName = 'StereoAudioSwtich'
