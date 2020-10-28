import {connection} from '@models/api'
import {PriorityCalculator} from '@models/trafficControl/PriorityCalculator'
import {connectionInfo} from '@stores/index'
import participants from '@stores/participants/Participants'
import _ from 'lodash'
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
    const local = participants.local.get()
    if (local.remoteVideoLimit >= 0 && res.video.length > local.remoteVideoLimit) {
      res.video.splice(local.remoteVideoLimit)
    }
    if (local.remoteAudioLimit >= 0 && res.audio.length > local.remoteAudioLimit) {
      res.audio.splice(local.remoteAudioLimit)
    }
    if (res !== memo) {
      // Send res to Jitsi bridge
      connection.conference.setPerceptibles([res.video, res.audio])
      //  console.log('setPerceptibles:', res)
      memo = res
    }
  }
})()
