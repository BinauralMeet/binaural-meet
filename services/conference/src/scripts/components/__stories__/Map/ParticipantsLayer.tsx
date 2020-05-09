import {ParticipantsLayer} from '@components/map/ParticipantsLayer'
import {StoreProvider} from '@hooks/ParticipantsStore'
import {Participants} from '@stores/Participants'
import faker from 'faker'
import {action} from 'mobx'
import React from 'react'

const ParticipantsLayerStory: React.FC<{}> = () => {
  const store = new Participants()
  addFakeParticipants(store)

  return <StoreProvider value={store}>
    <ParticipantsLayer />
  </StoreProvider>
}

export default ParticipantsLayerStory

const addFakeParticipants = action((store: Participants) => {
  const participantIds = [...Array<number>(10).keys()].map(id => `remote_${id}`)
  participantIds.forEach((participantId) => {
    store.join(participantId)
    const p = store.find(participantId)

    p.information.name = faker.name.findName()
    p.information.avatarSrc = faker.internet.avatar()

    p.pose.position = [0, 0].map(() => faker.random.number({
      min: 0,
      max: 500,
      precision: 1,
    })) as [number, number]
  })
})
