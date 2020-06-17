import {Participants} from '@stores/Participants'
import {SharedContents} from '@stores/SharedContents'
import faker from 'faker'
import {action} from 'mobx'
import { SharedContent as SharedContentStore, Pose2DMap } from '@stores/SharedContent'

interface FakeParticipantOptions {
  count?: number
  positionMin?: number,
  positionMax?: number,
}

const defaultFakeParticipantOptions: Required<FakeParticipantOptions> = {
  count: 10,
  positionMin: 0,
  positionMax: 500,
}

export const addFakeParticipants = action((store: Participants, option: FakeParticipantOptions = {}) => {
  const op = {
    ...defaultFakeParticipantOptions,
    ...option,
  }

  const participantIds = [...Array<number>(op.count).keys()].map(id => `remote_${id}`)
  participantIds.forEach((participantId) => {
    store.join(participantId)
    const p = store.find(participantId)

    p.information.name = faker.name.findName()
    p.information.avatarSrc = faker.internet.avatar()

    p.pose.position = [0, 0].map(() => faker.random.number({
      min: op.positionMin,
      max: op.positionMax,
      precision: 1,
    })) as [number, number]
  })
})
