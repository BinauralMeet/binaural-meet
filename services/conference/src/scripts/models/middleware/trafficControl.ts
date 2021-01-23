import {connection} from '@models/api'
import {PriorityCalculator, priorityLog} from '@models/trafficControl/PriorityCalculator'
import {connectionInfo} from '@stores/index'
import {participantsStore} from '@stores/participants'
import _ from 'lodash'
import {autorun} from 'mobx'

export const priorityCalculator = new PriorityCalculator()

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
    const res = priorityCalculator.update()
    if (!_.isEqual(res, memo)) {
      // Send res to Jitsi bridge
      connection.conference.setPerceptibles([res.video, res.audio])
      priorityLog('setPerceptibles:', res)
      console.log(`setPerceptibles:${JSON.stringify(res)}`)
      memo = _.cloneDeep(res)
    }
  }
})()
