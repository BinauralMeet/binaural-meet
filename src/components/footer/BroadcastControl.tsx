import {dialogStyle} from '@components/utils'
import Container from '@material-ui/core/Container'
import FormControlLabel from '@material-ui/core/FormControlLabel'
import Switch from '@material-ui/core/Switch'
import {useTranslation} from '@models/locales'
import {Observer} from 'mobx-react-lite'
import React from 'react'
import {participants} from '@stores/'

export const BroadcastControl: React.FC = () => {
  const local = participants.local
  const audioBroadcastSwitch = <Observer>{ () =>
    <Switch checked={local.physics.onStage} name="broadcast" style={dialogStyle}
      onChange={event => local.setPhysics({onStage: event.target.checked})} />
  }</Observer>
  const {t} = useTranslation()

  return <Container>
    <FormControlLabel
      control={audioBroadcastSwitch}
      label={<span style={dialogStyle}>{t('broadcastMyVoice')}</span>}
    />
  </Container>
}
BroadcastControl.displayName = 'BroadcastControl'
