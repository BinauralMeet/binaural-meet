import {connection} from '@models/api'
import {PriorityCalculator, priorityLog} from '@models/trafficControl/PriorityCalculator'
import {connectionInfo} from '@stores/index'
import {participantsStore} from '@stores/participants'
import _ from 'lodash'
import {autorun, reaction} from 'mobx'

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
reaction(() => {
  const local = participantsStore.local.get()

  return [local.remoteVideoLimit, local.remoteAudioLimit]
},       (limits) => {
  priorityCalculator.setLimits(limits)
},
)
// let interval:NodeJS.Timeout|undefined = undefined
const memoedUpdater = (() => {
  let memo: any = undefined

  return () => {
    const res = priorityCalculator.update()
    if (!_.isEqual(res, memo)) {
      // if (interval) clearInterval(interval)
      // Send res to Jitsi bridge
      connection.conference.setPerceptibles([res.video, res.audio])
      priorityLog('setPerceptibles:', res)
      console.log(`setPerceptibles:${JSON.stringify(res)}`)
      memo = _.cloneDeep(res)
      /*
	  interval = setInterval(()=>{
        connection.conference.setPerceptibles([res.video, res.audio])
        priorityLog('setPerceptibles:', res)
        console.log(`setPerceptibles:${JSON.stringify(res)}`)
        }, 10 * 1000)
       */
    }
  }
})()
