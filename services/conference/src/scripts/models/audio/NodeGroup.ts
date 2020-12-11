import {PARTICIPANT_SIZE, Pose3DAudio} from '@models/Participant'
import {mulV3, normV} from '@models/utils/coordinates'
import {ConfigurableParams, ConfigurableProp} from './StereoParameters'

export function setAudioOutputDevice(audio: HTMLAudioElement, deviceId: string) {
  const audioEx:any = audio
  if (audioEx.setSinkId) {
    audioEx.setSinkId(deviceId).then(
      () => { console.debug('audio.setSinkId:', deviceId, ' success') },
    ).catch(
      () => { console.warn('audio.setSinkId:', deviceId, ' failed') },
    )
  }
}


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
  private playMode: PlayMode|undefined
  private audioDeviceId = ''
  private distance = 1

  constructor(context: AudioContext, destination: MediaStreamAudioDestinationNode,
              playMode: PlayMode|undefined, audibility: boolean) {
    this.context = context

    this.gainNode = this.createGainNode(context)
    this.pannerNode = this.createPannerNode(context)

    this.gainNode.connect(this.pannerNode)
    this.pannerNode.connect(destination)

    this.playMode = playMode
    this.updateAudibility(audibility)
  }

  interval:NodeJS.Timeout|undefined = undefined
  setPlayMode(playMode: PlayMode|undefined) {
    this.playMode = playMode

    switch (playMode) {
      case 'Context': {
        this.sourceNode?.connect(this.gainNode)
        if (this.interval) {
          clearInterval(this.interval)
          this.interval = undefined
        }
        if (this.audioElement !== undefined) {
          this.audioElement.pause()
        }
        break
      }
      case 'Element': {
        this.sourceNode?.disconnect()

        if (this.audioElement === undefined) {
          this.audioElement = this.createAudioElement()
        }
        this.audioElement.muted = false
        if (!this.interval) {
          this.interval = setInterval(
            () => {
              this?.audioElement?.play().then(() => {
                if (this.interval) {
                  clearInterval(this.interval)
                  this.interval = undefined
                }
              })
            },
            500,
          )
        }
        break
      }
      default:
        console.error(`Unknown output: ${playMode}`)
        break
    }

    this.updateAudibility(this.audibility)
    this.updateVolume()
  }

  setAudioOutput(id: string) {
    if (this.audioDeviceId !== id) {
      this.audioDeviceId = id
      if (this.audioElement) {
        setAudioOutputDevice(this.audioElement, this.audioDeviceId)
      }
    }
  }

  updateStream(stream: MediaStream | undefined) {
    this.updateSourceStream(stream)
    this.setPlayMode(this.playMode)
  }

  updatePose(pose: Pose3DAudio) {
    const dist = normV(pose.position)
    const mul = ((dist * dist) / (this.pannerNode.refDistance * this.pannerNode.refDistance)
      + this.pannerNode.refDistance - 1) / (dist ? dist : 1)
    this.distance = mul * dist

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
    this.updateVolume()
  }
  private updateVolume() {
    let volume = 0
    if (this.playMode === 'Element') {
      volume = Math.pow(Math.max(this.distance, this.pannerNode.refDistance) / this.pannerNode.refDistance,
                        - this.pannerNode.rolloffFactor)
    }
    if (this.audioElement) {
      this.audioElement.volume = volume
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

  private audibility = false
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
    if (this.audioElement) {
      this.audioElement.volume = 0
      this.audioElement.pause()
      this.audioElement.remove()
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
      this.audioElement = this.createAudioElement()
    }

    this.audioElement.srcObject = stream
    //    }
  }

  createAudioElement() {
    const audio = new Audio()
    setAudioOutputDevice(audio, this.audioDeviceId)

    return audio
  }
}
