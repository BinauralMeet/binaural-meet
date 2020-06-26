import {StoreProvider, useStore as usePsStore} from '@hooks/ParticipantsStore'
import Button from '@material-ui/core/Button'
import ButtonGroup from '@material-ui/core/ButtonGroup'
import store from '@stores/participants/Participants'
import {action} from 'mobx'
import {useObserver} from 'mobx-react-lite'
import React from 'react'
import {ParticipantsVisualizer} from './ParticipantsStoreVisualizer'

export const Participants: React.FC<{}> = () => {
  return (
    <StoreProvider value={store}>
      <Controller />
      <ParticipantsVisualizer />
    </StoreProvider>
  )
}

const Controller: React.FC<{}> = () => {
  const participants = usePsStore()
  const noParticipant = useObserver(() => participants.count === 0)

  return (
    <div>
      <ButtonGroup>
        <Button onClick={() => {
          store.join(`participant_${participants.count}`)
        }}>Add one participant</Button>
        <Button onClick={() => {
          store.leave(`participant_${participants.count - 1}`)
        }} disabled={noParticipant}>Delete one participant</Button>
      </ButtonGroup>
      <Button disabled={noParticipant} onClick={updateP0Orientation}>Change participant 0's orientation</Button>
    </div>
  )
}

const updateP0Orientation = action('Change participant 0\'s orientation', () => {
  const participantStore = store.find('participant_0')
  participantStore.pose.orientation = Math.round(Math.random() * 360)
})
