import {PARTICIPANT_SIZE, Pose3DAudio} from '@models/Participant'
import {isChrome} from '@models/utils'
import {mulV3, normV} from '@models/utils/coordinates'
import {ConfigurableParams, ConfigurableProp} from './StereoParameters'

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
export const BROADCAST_DISTANCE = 100000

export type PlayMode = 'Context' | 'Element'

export class NodeGroup {
  private sourceNode: MediaStreamAudioSourceNode | undefined = undefined
  private audioElement: HTMLAudioElement | undefined = undefined

  private readonly gainNode: GainNode
  private readonly pannerNode: PannerNode

  private readonly context: AudioContext
  private playMode: PlayMode
  private pose: Pose3DAudio = {position:[0, 0, 0], orientation:[0, 0, 1]}

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

    this.updateAudibility(this.audibility)
  }

  updateStream(stream: MediaStream | undefined) {
    this.updateSourceStream(stream)
    this.usePlayMode(this.playMode)
  }

  updatePose(pose: Pose3DAudio) {
    this.pose = pose
    const dist = normV(pose.position)
    const mul = ((dist * dist) / (this.pannerNode.refDistance * this.pannerNode.refDistance)
      + this.pannerNode.refDistance - 1) / dist

    if (this.pannerNode.positionX && this.pannerNode.orientationX) {
      this.pannerNode.positionX.setValueAtTime(mul * pose.position[0], this.context.currentTime)
      this.pannerNode.positionY.setValueAtTime(mul * pose.position[1], this.context.currentTime)
      this.pannerNode.positionZ.setValueAtTime(mul * pose.position[2], this.context.currentTime)
      this.pannerNode.orientationX.setValueAtTime(pose.orientation[0], this.context.currentTime)
      this.pannerNode.orientationY.setValueAtTime(pose.orientation[1], this.context.currentTime)
      this.pannerNode.orientationZ.setValueAtTime(pose.orientation[2], this.context.currentTime)
    }else {
      this.pannerNode.setPosition(...mulV3(mul, pose.position))
      this.pannerNode.setOrientation(...pose.orientation)
    }
    if (this.playMode === 'Element') {
      const volume = Math.pow(Math.max(mul * dist, this.pannerNode.refDistance) / this.pannerNode.refDistance,
                              - this.pannerNode.rolloffFactor)
      if (this.audioElement) {
        this.audioElement.volume = volume
      }
    }
  }

  private _defaultPannerRefDistance = PARTICIPANT_SIZE
  private get defaultPannerRefDistance () { return this._defaultPannerRefDistance }
  private set defaultPannerRefDistance(val: number) {
    this._defaultPannerRefDistance = val
    if (this.pannerNode.refDistance !== BROADCAST_DISTANCE) { // not in broadcast mode
      this.pannerNode.refDistance = this._defaultPannerRefDistance
    }
  }
  updateBroadcast(broadcast: boolean) {
    if (!broadcast) {
      this.pannerNode.refDistance = this.defaultPannerRefDistance
    } else {
      this.pannerNode.refDistance = BROADCAST_DISTANCE
    }
  }

  updatePannerConfig(config: ConfigurableParams) {
    const observedPannerKeys: ConfigurableProp[] =
      ['coneInnerAngle', 'coneOuterAngle', 'coneOuterGain', 'distanceModel', 'maxDistance', 'distanceModel', 'panningModel', 'refDistance', 'rolloffFactor']
    observedPannerKeys.forEach((key) => {
      if (key === 'refDistance') {
        this.defaultPannerRefDistance = config['refDistance']
      } else {
        (this.pannerNode[key] as any) = config[key]
      }
    })
  }

  private audibility = true
  updateAudibility(audibility: boolean) {
    if (audibility) {
      this.gainNode.connect(this.pannerNode)
    } else {
      this.gainNode.disconnect()
    }

    if (this.audioElement) {
      this.audioElement.muted = !audibility
    }

    this.audibility = audibility
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

    //  Anyway, soruce must be connected audioElement, for the case of Element mode.
    //    if (isChrome) { // NOTE Chorme would not work if not connect stream to audio tag
    if (this.audioElement === undefined) {
      this.audioElement = new Audio()
    }

    this.audioElement.srcObject = stream
    //    }
  }
}
