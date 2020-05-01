import {StoreProvider} from '@hooks/ParticipantsStore'
import {Button, ButtonGroup} from '@material-ui/core'
import store from '@stores/Participants'
import {action} from 'mobx'
import React, {useState} from 'react'
import {ParticipantsVisualizer} from './ParticipantsStoreVisualizer'

export const Participants: React.FC<{}> = () => {
  const [participantCount, setCount] = useState(0)
  const noParticipant = participantCount === 0
  const controller = (
    <div>
      <ButtonGroup>
        <Button onClick={() => {
          store.join(`participant_${participantCount}`)
          setCount(participantCount + 1)
        }}>Add one participant</Button>
        <Button onClick={() => {
          store.leave(`participant_${participantCount - 1}`)
          setCount(participantCount - 1)
        }} disabled={noParticipant}>Delete one participant</Button>
      </ButtonGroup>
      <Button disabled={noParticipant} onClick={updateP0Orientation}>Change participant 0's orientation</Button>
    </div>
  )

  return (
    <div>
      {controller}
      <StoreProvider value={store}>
        <ParticipantsVisualizer />
      </StoreProvider>
    </div>
  )
}

const updateP0Orientation = action('Change participant 0\'s orientation', () => {
  const participantStore = store.find('participant_0')
  if (participantStore === undefined) {
    return
  }
  participantStore.pose.orientation = Math.round(Math.random() * 360)
})
