import {connection} from '@models/api'
import {PriorityCalculator} from '@models/trafficControl/PriorityCalculator'
import {connectionInfo} from '@stores/index'
import {participantsStore} from '@stores/participants'
import {autorun, reaction} from 'mobx'

const priorityCalculator = new PriorityCalculator()
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
reaction(() => {
  const local = participantsStore.local.get()

  return [local.remoteVideoLimit, local.remoteAudioLimit]
},       (limits) => {
  priorityCalculator.limitUpdated = true
},
)
const memoedUpdater = (() => {
  let memo: any = undefined

  return () => {
    const res = priorityCalculator.update()
    if (res !== memo) {
      // Send res to Jitsi bridge
      connection.conference.setPerceptibles([res.video, res.audio])
      //  console.log('setPerceptibles:', res)
      memo = res
    }
  }
})()
