//  Pure logic for LoadAdjuster.ts, deliberately free of any @stores/@models singleton imports so
//  it can be unit-tested without pulling in the whole live app graph (importing @stores/ transitively
//  constructs things like StereoManager, which needs a browser AudioContext and isn't safe outside
//  a real browser environment). See docs/auto-load-adjustment-design.md for the design this
//  implements.

export type LoadLevel = 0 | 1 | 2 | 3

export interface LoadState {
  cpu: LoadLevel
  network: LoadLevel
}

//  --- Tunable constants -- all empirically-guessed starting points, see docs/auto-load-adjustment-design.md §6 ---

//  CPU: ratio of actual/target frame interval (WebGLCanvas's frameThrottleMs), rolling-averaged.
export const CPU_FRAME_RATIO_WINDOW = 30      //  number of executed-frame samples to average over
export const CPU_LEVEL_UP_THRESHOLDS: [number, number, number] = [1.3, 1.6, 2.0]  //  ratio boundaries for level 1/2/3

//  Network: participants' averaged WebRTC-derived `quality` (0-100, 100=best; see RtcTransportStatsGot.ts).
export const NETWORK_LEVEL_DOWN_THRESHOLDS: [number, number, number] = [80, 60, 40]  //  quality boundaries for level 1/2/3

//  Hysteresis: worsening is confirmed quickly, recovery only after a long stable period, and only
//  one level at a time in either direction -- avoids flapping subscriptions on/off repeatedly.
export const CONFIRM_WORSEN_MS = 2000
export const CONFIRM_RECOVER_MS = 20000

//  Per-level effective local caps. Index = LoadLevel. Infinity = no additional restriction.
//  CPU pressure degrades VRM avatar rendering first (no network cost to that), only reaching for
//  video subscriptions at the most severe level. Network pressure goes straight for subscription
//  counts (avatar rendering doesn't consume bandwidth, so it wouldn't help). See design doc §4.2.
export const AVATAR_LIMIT_BY_CPU_LEVEL: number[] = [Infinity, 6, 3, 1]
export const VIDEO_LIMIT_BY_CPU_LEVEL: number[] = [Infinity, Infinity, Infinity, 3]
export const VIDEO_LIMIT_BY_NETWORK_LEVEL: number[] = [Infinity, 6, 3, 1]
export const AUDIO_LIMIT_BY_NETWORK_LEVEL: number[] = [Infinity, Infinity, Infinity, 6]

export interface HysteresisState {
  current: LoadLevel
  candidate: LoadLevel | undefined
  candidateSince: number
}

export function makeHysteresisState(): HysteresisState {
  return {current: 0, candidate: undefined, candidateSince: 0}
}

//  Moves `state.current` at most one level per call, towards `rawLevel`, only after `rawLevel` has
//  been the consistent candidate for the applicable confirm window (short when getting worse, long
//  when recovering).
export function stepLoadLevel(state: HysteresisState, rawLevel: LoadLevel, now: number): LoadLevel {
  if (rawLevel === state.current) {
    state.candidate = undefined
    return state.current
  }
  if (state.candidate !== rawLevel) {
    state.candidate = rawLevel
    state.candidateSince = now
  }
  const worsening = rawLevel > state.current
  const required = worsening ? CONFIRM_WORSEN_MS : CONFIRM_RECOVER_MS
  if (now - state.candidateSince >= required) {
    state.current = (worsening ? state.current + 1 : state.current - 1) as LoadLevel
    state.candidate = rawLevel === state.current ? undefined : rawLevel
    state.candidateSince = now
  }
  return state.current
}

export function levelFromUpThresholds(value: number, thresholds: [number, number, number]): LoadLevel {
  if (value >= thresholds[2]) { return 3 }
  if (value >= thresholds[1]) { return 2 }
  if (value >= thresholds[0]) { return 1 }
  return 0
}
export function levelFromDownThresholds(value: number, thresholds: [number, number, number]): LoadLevel {
  if (value < thresholds[2]) { return 3 }
  if (value < thresholds[1]) { return 2 }
  if (value < thresholds[0]) { return 1 }
  return 0
}

export function avatarLimitFor(cpu: LoadLevel): number {
  return AVATAR_LIMIT_BY_CPU_LEVEL[cpu]
}
export function videoLimitFor(cpu: LoadLevel, network: LoadLevel): number {
  return Math.min(VIDEO_LIMIT_BY_CPU_LEVEL[cpu], VIDEO_LIMIT_BY_NETWORK_LEVEL[network])
}
export function audioLimitFor(network: LoadLevel): number {
  return AUDIO_LIMIT_BY_NETWORK_LEVEL[network]
}

//  remoteVideoLimit/remoteAudioLimit (room-wide policy, see PriorityCalculator.ts) use -1 for
//  "unlimited"; the auto limits above use Infinity for the same concept. Combines the two without
//  ever loosening the room policy -- the auto limit only ever restricts further.
export function combineLimit(roomLimit: number, autoLimit: number): number {
  if (autoLimit === Infinity) { return roomLimit }
  if (roomLimit < 0) { return autoLimit }
  return Math.min(roomLimit, autoLimit)
}

export interface PositionedItem<T> {
  item: T
  onStage: boolean
  position: [number, number]
}

//  CPU-load response (see WebGLCanvas.tsx): keeps only the closest `limit` items to `localPos`,
//  same "onstage = always kept" rule PriorityCalculator.ts uses for video/audio priority. Generic
//  over the item type so it's usable (and testable) without depending on VRMAvatar/THREE.js types.
export function selectByProximity<T>(items: PositionedItem<T>[], localPos: [number, number], limit: number): T[] {
  if (limit === Infinity || items.length <= limit) { return items.map(i => i.item) }
  const withPriority = items.map(({item, onStage, position}) => {
    const priority = onStage ? 0 : Math.hypot(position[0] - localPos[0], position[1] - localPos[1])
    return {item, priority}
  })
  withPriority.sort((a, b) => a.priority - b.priority)
  return withPriority.slice(0, limit).map(wp => wp.item)
}
