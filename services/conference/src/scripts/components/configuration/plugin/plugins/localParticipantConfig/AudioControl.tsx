import {useStore} from '@hooks/ParticipantsStore'
import Container from '@material-ui/core/Container'
import FormControlLabel from '@material-ui/core/FormControlLabel'
import Switch from '@material-ui/core/Switch'
import {useObserver} from 'mobx-react-lite'
import React from 'react'

export const AudioControl: React.FC<{}> = () => {
  const local = useStore().local
  const broadcast = useObserver(() => local.get().physics.onStage)
  const audioBroadcastSwitch = <Switch checked={broadcast} name="broadcast" onChange={event => local.get().setPhysics({
    onStage: event.target.checked,
  })} />

  return <Container>
    <FormControlLabel
      control={audioBroadcastSwitch}
      label="Broadcast Audio"
    />
  </Container>
}
AudioControl.displayName = 'AudioControl'
