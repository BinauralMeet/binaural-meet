import {connection} from '@models/api'
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
    /*  Test for JVB
    if (res.video.length > 1) {
      res.video.pop()
    }
    if (res.audio.length > 1) {
      res.audio.pop()
    } //  */
    if (res !== memo) {
      // Send res to Jitsi bridge
      connection.conference.setPerceptibles([res.video, res.audio])
      //  console.log('setPerceptibles:', res)
      memo = res
    }
  }
})()
