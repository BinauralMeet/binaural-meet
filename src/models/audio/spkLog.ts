//  Low-level audio-device debug logging, always-on in dev builds (no runtime toggle) --
//  intentionally a different mechanism from the per-category loggers in @models/utils/logs.ts.
export const spkLog = import.meta.env.DEV ? console.log.bind(console) : (..._: any[]) => {}
