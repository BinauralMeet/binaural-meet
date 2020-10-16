import {PriorityCalculator} from '@models/trafficControl/PriorityCalculator'
import {connectionInfo} from '@stores/index'
import {autorun} from 'mobx'

const priorityCalculator = new PriorityCalculator()
const recalculateInterval = 1000
let intervalHandle: number | undefined = undefined

autorun(() => {
  const state = connectionInfo.state

  if (state === 'connected') {
    priorityCalculator.enable()
    intervalHandle = window.setInterval(
      () => {
        const res = priorityCalculator.update()
        console.log(res)
      },
      recalculateInterval,
    )
  } else if (state === 'disconnected') {
    priorityCalculator.disable()
    if (intervalHandle !== undefined) {
      clearInterval(intervalHandle)
    }
  }
})
