import {useStore} from '@hooks/ParticipantsStore'
import Container from '@material-ui/core/Container'
import FormControlLabel from '@material-ui/core/FormControlLabel'
import Switch from '@material-ui/core/Switch'
import {useObserver} from 'mobx-react-lite'
import React from 'react'

export const ViewpointControl: React.FC<{}> = () => {
  const local = useStore().local
  const thirdPersonView = useObserver(() => local.thirdPersonView)
  const viewpointSwitch = <Switch checked={!thirdPersonView} name="rotateMap"
    onChange={event => local.setThirdPersonView(!event.target.checked)} />

  return <Container>
    <FormControlLabel
      control={viewpointSwitch}
      label="Rotate map instead of avatar"
    />
  </Container>
}
ViewpointControl.displayName = 'ViewpointControl'
