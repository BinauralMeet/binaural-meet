import {pick} from 'lodash'
import {action, observable} from 'mobx'

// Doc of panner node parameters: https://developer.mozilla.org/en-US/docs/Web/API/PannerNode
export class StereoParameters implements ConfigurableParams {
  @observable coneInnerAngle = 45
  @observable coneOuterAngle = 360
  @observable coneOuterGain = 0
  @observable distanceModel: DistanceModelType = 'inverse'
  @observable maxDistance = 10000
  @observable panningModel: PanningModelType = 'HRTF'
  @observable refDistance = 10
  @observable rolloffFactor = 1

  @action
  updateParameters(params: Partial<ConfigurableParams>) {
    Object.assign(this, params)
  }
}

export type ConfigurableParams = Pick<PannerNode, ConfigurableProp>

export type ConfigurableProp = 'coneInnerAngle' | 'coneOuterAngle' | 'coneOuterGain' | 'distanceModel' |
                         'maxDistance' | 'distanceModel' | 'panningModel' | 'refDistance' | 'rolloffFactor'

export interface ConfigurablePair<T extends keyof ConfigurableParams>{
  key: T,
  value: ConfigurableParams[T],
}
