import {PARTICIPANT_SIZE} from '@models/Participant'
import {action, computed, observable} from 'mobx'

const PERCENT = 100
const REFDISTANCE_MAX = 12 * PARTICIPANT_SIZE  // max of no attenuation range
const DEFAULT_HEARABLE_RANGE = 40

// Doc of panner node parameters: https://developer.mozilla.org/en-US/docs/Web/API/PannerNode
export class StereoParameters implements ConfigurableParams {
  @observable coneInnerAngle = 0
  @observable coneOuterAngle = 180
  @observable coneOuterGain = 1
  @observable distanceModel: DistanceModelType = 'inverse'
  @observable maxDistance = 10000
  @observable panningModel: PanningModelType = 'HRTF'
  @observable refDistance = REFDISTANCE_MAX * DEFAULT_HEARABLE_RANGE / PERCENT
//  @observable rolloffFactor = 8
  @observable rolloffFactor = 12

  //  0 to 100, 0 has strongest attenuation
  @computed
  get hearableRange() {
    return this.refDistance * PERCENT / REFDISTANCE_MAX
  }
  @action
  setHearableRange(range:number) {
    this.refDistance = range / PERCENT * REFDISTANCE_MAX
  }

  @action
  updateParameters(params: Partial<ConfigurableParams>) {
    Object.assign(this, params)
  }
}

export type ConfigurableParams = Pick<PannerNode, ConfigurableProp>

export type ConfigurableProp = 'coneInnerAngle' | 'coneOuterAngle' | 'coneOuterGain' | 'distanceModel' |
                         'maxDistance' | 'distanceModel' | 'panningModel' | 'refDistance' | 'rolloffFactor'
