import {StoreProvider} from '@hooks/ParticipantsStore'
// import {Participant as IParticipant} from '@models/Participant'
import store from '@stores/Participants'
import React from 'react'
import {ParticipantsVisualizer} from './components/ParticipantsStoreVisualizer'

export default {
  title: 'Store',
}

export const participants = () => {
  return (
    <StoreProvider value={store}>
      <ParticipantsVisualizer />
    </StoreProvider>
  )
}

// const templateParticipant: IParticipant = {
//   id: 'participant',
//   pose: {
//     position: [0, 0],
//     orientation: 0,
//   },
//   information: {
//     name: 'hello',
//     email: 'hello@gmail.com',
//   },
// }
for (let i = 0; i < 10; i += 1) {
  store.join(`participant_${i}`)
}

