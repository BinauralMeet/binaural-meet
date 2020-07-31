import {PARTICIPANT_SIZE} from '@models/Participant'
import {pick} from 'lodash'
import {action, computed, observable} from 'mobx'

const PERCENT = 100
const ROLLOFFSCALE = 3  //  range 0 corresponds: 1/(2*rollOffScale) for 2avatars, 1/(5*rollOffScale) for 5avatars
const DEFAULT_HEARABLE_RANGE = 40

// Doc of panner node parameters: https://developer.mozilla.org/en-US/docs/Web/API/PannerNode
export class StereoParameters implements ConfigurableParams {
  @observable coneInnerAngle = 45
  @observable coneOuterAngle = 360
  @observable coneOuterGain = 0
  @observable distanceModel: DistanceModelType = 'inverse'
  @observable maxDistance = 10000
  @observable panningModel: PanningModelType = 'HRTF'
  @observable refDistance = PARTICIPANT_SIZE
  @observable rolloffFactor = (PERCENT - DEFAULT_HEARABLE_RANGE) * (this.refDistance * ROLLOFFSCALE / PERCENT)

  //  0 to 100, 0 has strongest attenuation
  @computed
  get hearableRange() {
    return PERCENT - this.rolloffFactor / (this.refDistance * ROLLOFFSCALE / PERCENT)
  }
  @action
  setHearableRange(range:number) {
    this.rolloffFactor = (PERCENT - range) * (this.refDistance * ROLLOFFSCALE / PERCENT)
  }

  @action
  updateParameters(params: Partial<ConfigurableParams>) {
    Object.assign(this, params)
  }
}

export type ConfigurableParams = Pick<PannerNode, ConfigurableProp>

export type ConfigurableProp = 'coneInnerAngle' | 'coneOuterAngle' | 'coneOuterGain' | 'distanceModel' |
                         'maxDistance' | 'distanceModel' | 'panningModel' | 'refDistance' | 'rolloffFactor'
