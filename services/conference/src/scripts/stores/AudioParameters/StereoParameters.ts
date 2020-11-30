import {BROADCAST_DISTANCE} from '@models/audio/NodeGroup'
import {ConfigurableParams} from '@models/audio/StereoParameters'
import {PARTICIPANT_SIZE} from '@models/Participant'
import participants from '@stores/participants/Participants'
import {action, autorun, computed, observable} from 'mobx'

const PERCENT = 100
const REFDISTANCE_MAX = 12 * PARTICIPANT_SIZE  // max of no attenuation range
const DEFAULT_HEARABLE_RANGE = 20

// Doc of panner node parameters: https://developer.mozilla.org/en-US/docs/Web/API/PannerNode
export class StereoParameters implements ConfigurableParams {
  @observable coneInnerAngle = 0
  @observable coneOuterAngle = 180
  @observable coneOuterGain = 1
  @observable maxDistance = 10000
  @observable panningModel: PanningModelType = 'HRTF'
  @observable distanceModel: DistanceModelType = 'exponential'
  @observable refDistance = 2 * PARTICIPANT_SIZE
  @observable rolloffFactor = 20
  refDistanceNormal:number = this.refDistance

  //  0 to 100, 0 has strongest attenuation
  @computed
  get hearableRange() {
    return this.refDistance * PERCENT / REFDISTANCE_MAX
  }

  @action
  setHearableRange(range:number) {
    this.refDistanceNormal = range / PERCENT * REFDISTANCE_MAX
    const onStage = participants.local.get().physics.onStage
    this.setBroadcast(onStage)
  }

  // make all participants hearable
  @action
  setBroadcast(bcast:boolean) {
    this.refDistance = bcast ? BROADCAST_DISTANCE - 1 : this.refDistanceNormal
    //  console.log(`setBroadcast is called bcast=${bcast}  distance=${this.refDistanceNormal}`)
  }

  @action
  updateParameters(params: Partial<ConfigurableParams>) {
    Object.assign(this, params)
  }
}

const stereoParameters = new StereoParameters()
export default stereoParameters

autorun(() => {
  const bcast = participants.local.get().physics.onStage
  stereoParameters.setBroadcast(bcast)
})
