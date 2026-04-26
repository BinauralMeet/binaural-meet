// TODO: Remove PlaybackAudioDebug logs after diagnosing initial silent playback.
export const PLAYBACK_AUDIO_DEBUG = true

const playbackAudioDebugText = (value: any) => {
  if (value === undefined) return 'undefined'
  if (value === null) return 'null'
  if (typeof value === 'string') return value
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : String(value)
  if (typeof value === 'boolean') return String(value)
  try {
    return JSON.stringify(value, (_key, val) => {
      if (val === undefined) return 'undefined'
      if (typeof val === 'number' && !Number.isFinite(val)) return String(val)
      return val
    })
  } catch(e) {
    return String(value)
  }
}

export const playbackAudioDebug = (...args: any[]) => {
  if (!PLAYBACK_AUDIO_DEBUG) return
  const line = `[PlaybackAudioDebug] ${args.map(playbackAudioDebugText).join(' ')}`
  const w = typeof window !== 'undefined' ? window as any : undefined
  if (w) {
    w.__playbackAudioDebugLogs = w.__playbackAudioDebugLogs || []
    w.__playbackAudioDebugLogs.push(line)
  }
  console.warn(line)
}
