export type ConfigurableParams = Pick<PannerNode, ConfigurableProp>

export type ConfigurableProp = 'coneInnerAngle' | 'coneOuterAngle' | 'coneOuterGain' | 'distanceModel' |
                         'maxDistance' | 'distanceModel' | 'panningModel' | 'refDistance' | 'rolloffFactor'

export const BROADCAST_DISTANCE = 100000
