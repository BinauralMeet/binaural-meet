import {useStore} from '@hooks/ParticipantsStore'
import Button from '@material-ui/core/Button'
import ButtonGroup from '@material-ui/core/ButtonGroup'
import { ParticipantBase } from '@stores/participants/ParticipantBase'
import store from '@stores/participants/Participants'
import {action} from 'mobx'
import {useObserver} from 'mobx-react-lite'
import React from 'react'

export const Controller: React.FC<{}> = () => {
  const participants = useStore()
  // const noParticipant = useObserver(() => participants.count === 0)
  const callback = useObserver(() => () => {
    addRandomRemoteParticipants(participants.count)
  })

  return (
    <div>
      <ButtonGroup>
        <Button onClick={callback}>Add random positioned participant</Button>
        <Button onClick={randomPositionLocal}>Random position of loacl participant</Button>
      </ButtonGroup>
      <ButtonGroup>
        <Button onClick={bindAudioStream}>Bind audio stream</Button>
        <Button onClick={unbindAudioStream}>Unbind audio stream</Button>
      </ButtonGroup>
    </div>
  )
}

const randomPosition = (): [number, number] => {
  return [
    Math.round(Math.random() * 100),
    Math.round(Math.random() * 100),
  ]
}

const addRandomRemoteParticipants = action((id: number) => {
  const name = `participant_${id}`
  store.join(name)
  const remote = store.find(name) as ParticipantBase
  remote.pose.position = randomPosition()
})

const randomPositionLocal = action(() => {
  const local = store.local
  local.pose.position = randomPosition()
})

const bindAudioStream = action(() => {
  console.error('TODO: create JitsiLocalTrack from MediaStream is needed but not done.')
  /*  const source = new AudioSource()
  store.remote.forEach((p) => {
    p.tracks.audio =
  })
  */
})

const unbindAudioStream = action(() => {
  store.remote.forEach((p) => {
    p.tracks.audio = undefined
  })
})
