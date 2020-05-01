const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor)

export interface Pose {
  position: [number, number, number],
  orientation: [number, number, number],
}

const DEFAULT_PANNER_NODE_CONFIG: Partial<PannerNode> & {refDistance: number} = {
  panningModel: 'HRTF',
  distanceModel: 'inverse',
  refDistance: 1,
  maxDistance: 100,
  rolloffFactor: 1,
  coneInnerAngle: 360,
  coneOuterAngle: 0,
  coneOuterGain: 0,
}
const BROADCAST_DISTANCE = 1000

export class NodeGroup {
  sourceNode: MediaStreamAudioSourceNode
  gainNode: GainNode
  pannerNode: PannerNode

  constructor(context: AudioContext, stream: MediaStream, pose: Pose) {
    this.sourceNode = context.createMediaStreamSource(stream)
    this.gainNode = this.createGainNode(context)
    this.pannerNode = this.createPannerNode(context)

    this.updatePose(pose)

    this.sourceNode.connect(this.gainNode)
    this.gainNode.connect(this.pannerNode)
    this.pannerNode.connect(context.destination)

    if (isChrome) { // NOTE Chorme would not work if not connect stream to audio tag
      const a = new Audio()

      a.muted = true
      a.srcObject = stream
    }
  }

  updatePose(pose: Pose) {
    this.pannerNode.setPosition(...pose.position)
    this.pannerNode.setOrientation(...pose.orientation)
  }

  toggleBroadcast() {
    if (this.isBroadcast) {
      this.pannerNode.refDistance = DEFAULT_PANNER_NODE_CONFIG.refDistance
    } else {
      this.pannerNode.refDistance = BROADCAST_DISTANCE
    }
  }

  get isBroadcast(): boolean {
    return this.pannerNode.refDistance === BROADCAST_DISTANCE
  }

  private createGainNode(context: AudioContext) {
    const gain = context.createGain()

    gain.gain.value = 1

    return gain
  }

  private createPannerNode(context: AudioContext) {
    const panner = context.createPanner()

    for (const [key, value] of Object.entries(DEFAULT_PANNER_NODE_CONFIG)) {
      (panner as any)[key] = value
    }

    return panner
  }
}
