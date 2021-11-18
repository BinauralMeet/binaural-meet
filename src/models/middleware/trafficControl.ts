import {connection} from '@models/api'
import {PriorityCalculator, priorityLog} from '@models/trafficControl/PriorityCalculator'
import {connectionInfo} from '@stores/index'
import {participantsStore} from '@stores/participants'
import JitsiMeetJS from 'lib-jitsi-meet'
import _ from 'lodash'
import {autorun} from 'mobx'
declare const d:any                  //  from index.html

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
      const perceptibles:JitsiMeetJS.BMPerceptibles = {
        audibles: priorityCalculator.lastAudios,
        visibleContents: priorityCalculator.lastContentVideos,
        visibleParticipants: priorityCalculator.lastParticipantVideos,
      }
      connection.conference.setPerceptibles(perceptibles)
      priorityLog('setPerceptibles:', newList)
      //console.log(`setPerceptibles:${JSON.stringify(res)}`)
      memo = _.cloneDeep(newList)
    }
  }
})()
