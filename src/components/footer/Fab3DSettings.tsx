import Container from '@material-ui/core/Container'
import Grid from '@material-ui/core/Grid'
import Popover from '@material-ui/core/Popover'
import Switch from '@material-ui/core/Switch'
import {useTranslation} from '@models/locales'
import {useObserver} from 'mobx-react-lite'
import {FabWithTooltip} from '@components/utils/FabEx'
import Button from '@material-ui/core/Button'
import {participants} from '@stores/'
import React from 'react';
import {Icon} from '@iconify/react'

const iconThreeCircle = {
	"width": 256,
	"height": 256,
	"body": "<path transform=\"scale(1,-1) translate(0,-256)\" fill=\"currentColor\" d=\"M176 76a48 48 0 1 0-48 48a48.05 48.05 0 0 0 48-48m-48 24a24 24 0 1 1 24-24a24 24 0 0 1-24 24m60 24a48 48 0 1 0 48 48a48.05 48.05 0 0 0-48-48m0 72a24 24 0 1 1 24-24a24 24 0 0 1-24 24M68 124a48 48 0 1 0 48 48a48.05 48.05 0 0 0-48-48m0 72a24 24 0 1 1 24-24a24 24 0 0 1-24 24\" />"
}
const iconPeople = {
	"width": 32,
	"height": 32,
	"body": "<path fill=\"currentColor\" d=\"M21.066 20.667c1.227-.682 1.068-3.31-.354-5.874c-.61-1.104-1.36-1.998-2.11-2.623a5.23 5.23 0 0 1-3.1 1.03a5.23 5.23 0 0 1-3.105-1.03c-.75.625-1.498 1.52-2.11 2.623c-1.423 2.563-1.58 5.192-.35 5.874c.548.312 1.126.078 1.722-.496a10.5 10.5 0 0 0-.167 1.874c0 2.938 1.14 5.312 2.543 5.312c.846 0 1.265-.865 1.466-2.188c.2 1.314.62 2.188 1.46 2.188c1.397 0 2.546-2.375 2.546-5.312c0-.66-.062-1.29-.168-1.873c.6.575 1.176.813 1.726.497zM15.5 12.2a4.279 4.279 0 1 0-.003-8.557A4.279 4.279 0 0 0 15.5 12.2m8.594 2.714a3.514 3.514 0 0 0 0-7.025a3.513 3.513 0 1 0 .001 7.027zm4.28 2.13c-.502-.908-1.116-1.642-1.732-2.155a4.3 4.3 0 0 1-2.546.845c-.756 0-1.46-.207-2.076-.55c.496 1.093.803 2.2.86 3.19c.094 1.516-.38 2.64-1.328 3.165a2 2 0 0 1-.653.224c-.057.392-.096.8-.096 1.23c0 2.413.935 4.362 2.088 4.362c.694 0 1.04-.71 1.204-1.796c.163 1.08.508 1.796 1.2 1.796c1.145 0 2.09-1.95 2.09-4.36c0-.543-.053-1.06-.14-1.54c.492.473.966.668 1.418.408c1.007-.56.877-2.718-.29-4.82zm-21.468-2.13a3.512 3.512 0 1 0-3.514-3.512a3.515 3.515 0 0 0 3.514 3.514zm2.535 6.622c-1.592-.885-1.738-3.524-.456-6.354a4.24 4.24 0 0 1-2.078.553c-.956 0-1.832-.32-2.55-.846c-.615.512-1.228 1.246-1.732 2.153c-1.167 2.104-1.295 4.262-.287 4.82c.45.258.925.065 1.414-.406a9 9 0 0 0-.135 1.538c0 2.412.935 4.36 2.088 4.36c.694 0 1.04-.71 1.204-1.795c.165 1.08.51 1.796 1.2 1.796c1.147 0 2.09-1.95 2.09-4.36c0-.433-.04-.842-.097-1.234a2 2 0 0 1-.66-.226z\" />"
}
export const SoundSetting: React.FC<{}> = () => {
  const soundLocalizationBase = useObserver(() => participants.local.soundLocalizationBase)
  const stereo = useObserver(() => participants.local.useStereoAudio)
  const {t} = useTranslation()

  return <>
    <Container>
      <Grid component="label" container={true} alignItems="center" spacing={1}>
        <Grid item={true}>{t('slMonaural')}</Grid>
        <Grid item={true}>
          <Switch checked={stereo} onChange={() => {
            participants.local.useStereoAudio = !stereo
            participants.local.saveMediaSettingsToStorage()
          }} name="soundLoc" />
        </Grid>
        <Grid item={true}>{t('slBinaural')}</Grid>
      </Grid>
    </Container>
    <Container>
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
  </>
}
SoundSetting.displayName = 'SoundSetting'

export const AvatarSetting: React.FC<{}> = () => {
  const avatarDisplay3D = useObserver(() => participants.local.avatarDisplay3D)
  const avatarDisplay2_5D = useObserver(() => participants.local.avatarDisplay2_5D)
  const {t} = useTranslation()

  return <>
    <Container>
      <Grid component="label" container={true} alignItems="center" spacing={1}>
        <Grid xs={2}   item={true}>{t('avatar3D')}</Grid>
        <Switch checked={avatarDisplay3D === true} onChange={(ev, checked) => {
            participants.local.avatarDisplay3D = checked
            if (participants.local.avatarDisplay3D){
              participants.local.soundLocalizationBase = 'avatar'
            }
            participants.local.saveMediaSettingsToStorage()
          }} name="avatar3D" />
      </Grid>
    </Container>
    <Container>
      <Grid component="label" container={true} alignItems="center" spacing={1}>
        <Grid xs={2} item={true}>{t('avatar2_5D')}</Grid>
        <Switch checked={avatarDisplay2_5D === true} onChange={(ev, checked) => {
            participants.local.avatarDisplay2_5D = checked
            participants.local.saveMediaSettingsToStorage()
          }} name="avatar2_5D" />
      </Grid>
    </Container>
  </>
}
AvatarSetting.displayName = 'AvatarSetting'


export const Fab3DSettings: React.FC<{size?: number, iconSize:number}> = (props) => {
  const [anchor, setAnchor] = React.useState<Element|null>(null)
  const [showStereoBase, setShowSteraoBase] = React.useState(false)
  const avatarDisplay3D = useObserver(() => participants.local.avatarDisplay3D)

  const switch3D = () => {
    //  As Chrome support AEC, skip the confirmation now.
    if (true){ // stereo || participants.local.headphoneConfirmed){
      participants.local.avatarDisplay3D = !avatarDisplay3D
      if (participants.local.avatarDisplay3D){
        participants.local.useStereoAudio = true
        participants.local.soundLocalizationBase = 'avatar'
      }
      participants.local.saveMediaSettingsToStorage()
    }
  }

  const {t} = useTranslation()

  return <>
    <FabWithTooltip size={props.size} title={
        <>
          {t('tt3D')}
        </>}
      color = {avatarDisplay3D ? 'secondary' : 'primary'}
      onClick={(ev)=>{setAnchor(ev.currentTarget); switch3D()}}
      onClickMore = {(ev) => { setShowSteraoBase(true); setAnchor(ev.currentTarget) }} >
      {avatarDisplay3D ?  <Icon icon={iconPeople} style={{width:props.iconSize, height:props.iconSize}} />
        : <Icon icon={iconThreeCircle} style={{width:props.iconSize*1, height:props.iconSize*1}} /> }
    </FabWithTooltip>
    <Popover open={showStereoBase} onClose={() => setShowSteraoBase(false)}
      anchorEl={anchor} anchorOrigin={{vertical:'top', horizontal:'left'}}
      anchorReference = "anchorEl" >
      <div style={{padding:20}}>
        {t('avatarDisplay')} <br />
        <AvatarSetting />
        {t('soundLocalization')} <br />
        <SoundSetting />
      </div>
    </Popover>
  </>
}
Fab3DSettings.displayName = 'Fab3DSettings'
