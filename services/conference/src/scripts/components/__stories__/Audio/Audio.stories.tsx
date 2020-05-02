import {StoreProvider, useStore as usePsStore} from '@hooks/ParticipantsStore'
import {Button, ButtonGroup} from '@material-ui/core'
import {assert} from '@models/utils'
import store from '@stores/Participants'
import {action} from 'mobx'
import {useObserver} from 'mobx-react-lite'
import React from 'react'
import {ParticipantsVisualizer} from './components/ParticipantsStoreVisualizer'

export default {
  title: 'Audio',
}

const Controller: React.FC<{}> = () => {
  const participants = usePsStore()
  // const noParticipant = useObserver(() => participants.count === 0)
  const callback = useObserver(() => () => {
    addRandomRemoteParticipants(participants.count)
  })

  return (
    <div>
      <ButtonGroup>
        <Button onClick={callback}>Add random positioned participant</Button>
      </ButtonGroup>
    </div>
  )
}

export const stereo: React.FC<{}> = () => {
  return (
    <StoreProvider value={store}>
      <Controller />
      <ParticipantsVisualizer />
    </StoreProvider>
  )
}

const addRandomRemoteParticipants = action((id: number) => {
  const name = `participant_${id}`
  store.join(name)
  const remote = store.find(name)
  assert(remote !== undefined)
  remote.pose.position = [
    Math.round(Math.random() * 100),
    Math.round(Math.random() * 100),
  ]
})
