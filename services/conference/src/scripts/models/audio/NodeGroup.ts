import {Pose3DAudio} from '@models/Participant'

const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor)

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
  private sourceNode: MediaStreamAudioSourceNode | undefined = undefined
  private audioElement: HTMLAudioElement | undefined = undefined

  private readonly gainNode: GainNode
  private readonly pannerNode: PannerNode

  private readonly context: AudioContext

  constructor(context: AudioContext) {
    this.context = context

    this.gainNode = this.createGainNode(context)
    this.pannerNode = this.createPannerNode(context)

    this.gainNode.connect(this.pannerNode)
    this.pannerNode.connect(context.destination)
  }

  updateStream(stream: MediaStream | undefined) {
    if (this.sourceNode !== undefined) {
      this.sourceNode.disconnect()
    }

    if (stream === undefined) {
      this.sourceNode = undefined

      return
    }

    this.sourceNode = this.context.createMediaStreamSource(stream)
    this.sourceNode.connect(this.gainNode)

    if (isChrome) { // NOTE Chorme would not work if not connect stream to audio tag
      if (this.audioElement === undefined) {
        this.audioElement = new Audio()
        this.audioElement.muted = true
      }

      this.audioElement.srcObject = stream
    }
  }

  updatePose(pose: Pose3DAudio) {
    this.pannerNode.setPosition(...pose.position)
    this.pannerNode.setOrientation(...pose.orientation)
  }

  updateBroadcast(broadcast: boolean) {
    if (!broadcast) {
      this.pannerNode.refDistance = DEFAULT_PANNER_NODE_CONFIG.refDistance
    } else {
      this.pannerNode.refDistance = BROADCAST_DISTANCE
    }
  }

  updateAudibility(audibility: boolean) {
    if (audibility) {
      this.gainNode.connect(this.pannerNode)
    } else {
      this.gainNode.disconnect()
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
