import { conference } from '@models/conference'
import {PriorityCalculator, priorityLog} from '@models/trafficControl/PriorityCalculator'
import {connectionInfo} from '@stores/index'
import {participantsStore} from '@stores/participants'
import _ from 'lodash'
import {autorun} from 'mobx'
declare const d:any                  //  from index.html

export interface Perceptibles{
  audibles: string[],
  visibleContents: string[],
  visibleParticipants: string[],
}

export const priorityCalculator = new PriorityCalculator()
d.priorityCalculator = priorityCalculator

const recalculateInterval = 1000
let intervalHandle: number | undefined = undefined


autorun(() => {
  const state = connectionInfo.state

  if (state === 'connected') {
    priorityCalculator.enable()
    intervalHandle = window.setInterval(
      memoedUpdater,
      recalculateInterval,
    )
  } else if (state === 'disconnected') {
    priorityCalculator.disable()
    if (intervalHandle !== undefined) {
      clearInterval(intervalHandle)
    }
  }
})
autorun(() => {
  const local = participantsStore.local
  priorityCalculator.setLimits([local.remoteVideoLimit, local.remoteAudioLimit])
})
// let interval:NodeJS.Timeout|undefined = undefined
const memoedUpdater = (() => {
  let memo: any = undefined

  return () => {
    priorityCalculator.update()
    const newList = [priorityCalculator.lastContentVideos,
      priorityCalculator.lastParticipantVideos, priorityCalculator.lastAudios]
    if (!_.isEqual(newList, memo)) {
      // Send res to Jitsi bridge
      conference.setPerceptibles({
        audibles: priorityCalculator.lastAudios,
        visibleContents: priorityCalculator.lastContentVideos,
        visibleParticipants: priorityCalculator.lastParticipantVideos,
      })
      priorityLog('setPerceptibles:', newList)
      memo = _.cloneDeep(newList)
    }
  }
})()
