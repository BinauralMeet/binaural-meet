import {StoreProvider} from '@hooks/ParticipantsStore'
import {Button, ButtonGroup} from '@material-ui/core'
import store from '@stores/Participants'
import React, {useState} from 'react'
import {ParticipantsVisualizer} from './components/ParticipantsStoreVisualizer'

export default {
  title: 'Store',
}

export const participants = () => {
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
      <Button disabled={noParticipant} onClick={() => {
        const participantStore = store.find('participant_0')
        if (participantStore === undefined) {
          return
        }
        participantStore.pose.orientation = Math.round(Math.random() * 360)
      }}>Change participant 0's orientation</Button>
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

