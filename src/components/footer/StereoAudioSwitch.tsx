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
import {FabWithTooltip} from '@components/utils/FabEx'
import Button from '@material-ui/core/Button'

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
  const [anchor, setAnchor] = React.useState<Element|null>(null)
  const [showStereoBase, setShowSteraoBase] = React.useState(false)
  const [showConfirmation, setShowConfirmation] = React.useState(false)

  const switchStereo = () => {
    if (stereo || participants.local.headphoneConfirmed){
      participants.local.headphoneConfirmed = true
      participants.local.useStereoAudio = !stereo
      participants.local.saveMediaSettingsToStorage()
    }else{
      setShowConfirmation(true)
    }
  }

  const {t} = useTranslation()

  return <>
    <FabWithTooltip size={props.size} title={
        <>
          {isChromium ? t('headphoneL1Chrome') : t('headphoneL1')} <br />
          {t('headphoneL2')}
        </>}
      color = {stereo ? 'secondary' : 'primary'}
      onClick={(ev)=>{setAnchor(ev.currentTarget); switchStereo()}}
      onClickMore = {stereo ? (ev) => { setShowSteraoBase(true); setAnchor(ev.currentTarget) } : undefined} >
      {stereo ? <HeadsetIcon style={{width:props.iconSize, height:props.iconSize}} />  :
      <SpeakerIcon style={{width:props.iconSize, height:props.iconSize}} /> }
    </FabWithTooltip>
    <Popover open={showConfirmation} onClose={() => setShowConfirmation(false)}
      anchorEl={anchor} anchorOrigin={{vertical:'top', horizontal:'left'}}
      anchorReference = "anchorEl" >
      <div style={{padding:20, width:'20em'}}>
      <strong>{t('stereoNote')}</strong> <br /><br />
      {t('stereoNoteDesc')} <br />
      <br />
      <Button variant="contained" color="secondary" style={{textTransform:'none'}}
        onClick={() => {
          participants.local.headphoneConfirmed = true
          switchStereo()
          setShowConfirmation(false) }} >
        {t('stereoConfirmed')}
      </Button> <br />
      <br />
      <Button variant="contained" color="primary" style={{textTransform:'none'}}
        onClick={() => { setShowConfirmation(false) }} >
        {t('stereoCancel')}
      </Button>
      </div>
    </Popover>
    <Popover open={showStereoBase} onClose={() => setShowSteraoBase(false)}
      anchorEl={anchor} anchorOrigin={{vertical:'top', horizontal:'left'}}
      anchorReference = "anchorEl" >
      <div style={{padding:20}}>
        {t('soundLocalizationBasedOn')} <br />
        <SoundLocalizationSetting />
      </div>
    </Popover>
  </>
}
StereoAudioSwitch.displayName = 'StereoAudioSwtich'
