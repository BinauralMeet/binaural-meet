import {Pose3DAudio, PARTICIPANT_SIZE} from '@models/Participant'
import {isChrome} from '@models/utils'

// NOTE Set default value will change nothing. Because value will be overwrite by store in ConnectedGroup
const DEFAULT_PANNER_NODE_CONFIG: Partial<PannerNode> & {refDistance: number} = {
  panningModel: 'HRTF',
  distanceModel: 'inverse',
  refDistance: PARTICIPANT_SIZE,
  maxDistance: 10000,
  rolloffFactor: 1,
  coneInnerAngle: 45,
  coneOuterAngle: 360,
  coneOuterGain: 0,
}
const BROADCAST_DISTANCE = 1000

export type PlayMode = 'Context' | 'Element'

export class NodeGroup {
  private sourceNode: MediaStreamAudioSourceNode | undefined = undefined
  private audioElement: HTMLAudioElement | undefined = undefined

  private readonly gainNode: GainNode
  public readonly pannerNode: PannerNode

  private readonly context: AudioContext
  private playMode: PlayMode

  constructor(context: AudioContext, destination: MediaStreamAudioDestinationNode, playMode: PlayMode = 'Context') {
    this.context = context

    this.gainNode = this.createGainNode(context)
    this.pannerNode = this.createPannerNode(context)

    this.gainNode.connect(this.pannerNode)
    this.pannerNode.connect(destination)

    this.playMode = playMode
  }

  usePlayMode(playMode: PlayMode) {
    this.playMode = playMode

    switch (playMode) {
      case 'Context': {
        this.sourceNode?.connect(this.gainNode)
        if (this.audioElement !== undefined) {
          this.audioElement.pause()
        }
        break
      }
      case 'Element': {
        this.sourceNode?.disconnect()

        if (this.audioElement === undefined) {
          this.audioElement = new Audio()
        }
        this.audioElement.muted = false
        this.audioElement.play()

        break
      }
      default:
        console.error(`Unknown output: ${playMode}`)
        break
    }
  }

  updateStream(stream: MediaStream | undefined) {
    this.updateSourceStream(stream)
    this.usePlayMode(this.playMode)
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

  disconnect() {
    if (this.sourceNode) {
      this.sourceNode.disconnect()
    }

    this.gainNode.disconnect()
    this.pannerNode.disconnect()
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

  private updateSourceStream(stream: MediaStream | undefined) {
    if (this.sourceNode !== undefined) {
      this.sourceNode.disconnect()
    }

    if (stream === undefined) {
      this.sourceNode = undefined

      return
    }

    this.sourceNode = this.context.createMediaStreamSource(stream)

    if (isChrome) { // NOTE Chorme would not work if not connect stream to audio tag
      if (this.audioElement === undefined) {
        this.audioElement = new Audio()
      }

      this.audioElement.srcObject = stream
    }
  }

  setMute(muted:boolean) {
    if (this.audioElement) {
      this.audioElement.muted = muted
    }
  }
}
