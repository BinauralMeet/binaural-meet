//  Detects local CPU/network load and derives local-only, additional caps on top of the
//  room-wide remoteVideoLimit/remoteAudioLimit policy. See docs/auto-load-adjustment-design.md
//  for the full design and rationale, and LoadAdjusterLogic.ts for the pure decision logic this
//  wires up to live store data.
//
//  IMPORTANT: this must never write to LocalParticipant.remoteVideoLimit/remoteAudioLimit --
//  those are a room-wide policy broadcast to every participant via PARTICIPANT_TRACKLIMITS
//  (see DataSync.ts). This module only produces a separate, local-only cap that callers
//  (PriorityCalculator, WebGLCanvas) combine with the room policy via Math.min().
import {participants} from '@stores/'
import {autorun, makeObservable, observable} from 'mobx'
import {priorityLog} from '@models/utils'
import {LoadLevel, LoadState, HysteresisState, makeHysteresisState, stepLoadLevel,
  levelFromUpThresholds, levelFromDownThresholds, avatarLimitFor, videoLimitFor, audioLimitFor,
  CPU_FRAME_RATIO_WINDOW, CPU_LEVEL_UP_THRESHOLDS, NETWORK_LEVEL_DOWN_THRESHOLDS} from './LoadAdjusterLogic'

export class LoadAdjuster {
  @observable.ref loadState: LoadState = {cpu: 0, network: 0}
  @observable autoVideoLimit = Infinity
  @observable autoAudioLimit = Infinity
  @observable autoAvatarLimit = Infinity

  private cpuHysteresis: HysteresisState = makeHysteresisState()
  private networkHysteresis: HysteresisState = makeHysteresisState()
  private frameRatioSamples: number[] = []

  constructor() {
    makeObservable(this)
    autorun(() => {
      if (!participants.local.autoLoadAdjustment) {
        this.resetToDisabled()
        return
      }
      const remoteQualities = Array.from(participants.remote.values())
        .map(p => p.quality)
        .filter((q): q is number => q !== undefined)
      const avgQuality = remoteQualities.length ?
        remoteQualities.reduce((a, b) => a + b, 0) / remoteQualities.length : 100
      const rawNetwork = levelFromDownThresholds(avgQuality, NETWORK_LEVEL_DOWN_THRESHOLDS)
      const network = stepLoadLevel(this.networkHysteresis, rawNetwork, Date.now())
      this.applyLevels(this.loadState.cpu, network)
    })
  }

  //  Called from WebGLCanvas's animate() loop for every frame it actually renders (i.e. after its
  //  own frameThrottleMs gate), with the real wall-clock gap since the previous rendered frame.
  public recordFrameInterval(actualMs: number, targetMs: number) {
    if (!participants.local.autoLoadAdjustment) { return }
    this.frameRatioSamples.push(actualMs / targetMs)
    if (this.frameRatioSamples.length > CPU_FRAME_RATIO_WINDOW) { this.frameRatioSamples.shift() }
    const avgRatio = this.frameRatioSamples.reduce((a, b) => a + b, 0) / this.frameRatioSamples.length
    const rawCpu = levelFromUpThresholds(avgRatio, CPU_LEVEL_UP_THRESHOLDS)
    const cpu = stepLoadLevel(this.cpuHysteresis, rawCpu, Date.now())
    this.applyLevels(cpu, this.loadState.network)
  }

  //  Bypasses hysteresis entirely -- when the user turns auto-adjustment off, restrictions lift
  //  immediately rather than decaying gradually like a real recovery would.
  private resetToDisabled() {
    this.frameRatioSamples = []
    this.cpuHysteresis = makeHysteresisState()
    this.networkHysteresis = makeHysteresisState()
    if (this.loadState.cpu !== 0 || this.loadState.network !== 0) {
      this.loadState = {cpu: 0, network: 0}
    }
    this.autoAvatarLimit = Infinity
    this.autoVideoLimit = Infinity
    this.autoAudioLimit = Infinity
  }

  private applyLevels(cpu: LoadLevel, network: LoadLevel) {
    if (cpu === this.loadState.cpu && network === this.loadState.network) { return }
    this.loadState = {cpu, network}
    this.autoAvatarLimit = avatarLimitFor(cpu)
    this.autoVideoLimit = videoLimitFor(cpu, network)
    this.autoAudioLimit = audioLimitFor(network)
    priorityLog(`LoadAdjuster: cpu=${cpu} network=${network} ` +
      `avatarLimit=${this.autoAvatarLimit} videoLimit=${this.autoVideoLimit} audioLimit=${this.autoAudioLimit}`)
  }
}

export const loadAdjuster = new LoadAdjuster()
