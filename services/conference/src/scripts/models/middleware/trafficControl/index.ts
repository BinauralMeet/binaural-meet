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

const memoedUpdater = (() => {
  let memo: any = undefined

  return () => {
    const res = priorityCalculator.update()
    if (res !== memo) {
      // TODO send res to Jitsi bridge
      // console.log('new priority:', res)
      memo = res
    }
  }
})()
