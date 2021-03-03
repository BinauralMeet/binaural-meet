import {useStore} from '@hooks/ParticipantsStore'
import Container from '@material-ui/core/Container'
import FormControlLabel from '@material-ui/core/FormControlLabel'
import Switch from '@material-ui/core/Switch'
import {useTranslation} from '@models/locales'
import {useObserver} from 'mobx-react-lite'
import React from 'react'

export const BroadcastControl: React.FC<{}> = () => {
  const local = useStore().local
  const broadcast = useObserver(() => local.physics.onStage)
  const audioBroadcastSwitch = <Switch checked={broadcast} name="broadcast" onChange={event => local.setPhysics({
    onStage: event.target.checked,
  })} />
  const {t} = useTranslation()

  return <Container>
    <FormControlLabel
      control={audioBroadcastSwitch}
      label={t('broadcastMyVoice')}
    />
  </Container>
}
BroadcastControl.displayName = 'BroadcastControl'
