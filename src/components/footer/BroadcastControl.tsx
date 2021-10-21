import {BMProps} from '@components/utils'
import Container from '@material-ui/core/Container'
import FormControlLabel from '@material-ui/core/FormControlLabel'
import Switch from '@material-ui/core/Switch'
import {useTranslation} from '@models/locales'
import {Observer} from 'mobx-react-lite'
import React from 'react'

export const BroadcastControl: React.FC<BMProps> = (props: BMProps) => {
  const local = props.stores.participants.local
  const audioBroadcastSwitch = <Observer>{ () =>
    <Switch checked={local.physics.onStage} name="broadcast"
      onChange={event => local.setPhysics({onStage: event.target.checked})} />
  }</Observer>
  const {t} = useTranslation()

  return <Container>
    <FormControlLabel
      control={audioBroadcastSwitch}
      label={t('broadcastMyVoice')}
    />
  </Container>
}
BroadcastControl.displayName = 'BroadcastControl'
