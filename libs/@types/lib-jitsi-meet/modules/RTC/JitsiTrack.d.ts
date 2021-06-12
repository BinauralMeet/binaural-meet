// Type definitions for [~THE LIBRARY NAME~] [~OPTIONAL VERSION NUMBER~]
// Project: [~THE PROJECT NAME~]
// Definitions by: [~YOUR NAME~] <[~A URL FOR YOU~]>

import { EventEmitter } from "events";
import TraceablePeerConnection from './TraceablePeerConnection'

// DOMString - audio and video
export declare namespace MediaType {
  export const AUDIO: 'audio'
  export const PRESENTER: 'presenter'
  export const VIDEO: 'video'
}

export type TMediaType = typeof MediaType.AUDIO | typeof MediaType.PRESENTER | typeof MediaType.VIDEO

export declare namespace VideoType {
  export const CAMERA: 'camera'
  export const DESKTOP: 'desktop'
}

export type TVideoType = typeof VideoType.CAMERA | typeof VideoType.DESKTOP

export declare namespace JitsiTrackEvents {
  export const TRACK_MUTE_CHANGED = 'track.trackMuteChanged';
  export const TRACK_VIDEOTYPE_CHANGED = 'track.videoTypeChanged';
  export const LOCAL_TRACK_STOPPED = 'track.stopped'; //  The media track was removed to the conference.
}

interface TrackInfo {
  deviceId: string;
  facingMode: string;
  mediaType: TMediaType;
  resolution: any;
  rtcId: number;
  sourceId?: string;
  sourceType?: string;
  stream: MediaStream;
  track: any;
  videoType: TVideoType | null;
  effects?: Object;
}

declare class JitsiTrack extends EventEmitter {
  constructor(
    conference: Object,
    stream: MediaStream,
    track: MediaStreamTrack,
    streamInactiveHandler: Function,
    trackMediaType: TMediaType,
    videoType: string,
  );
  videoType?: string
  disposed: boolean
  getType: () => 'video' | 'audio'
  isAudioTrack: () => boolean
  isWebRTCTrackMuted: () => boolean
  isVideoTrack: () => boolean
  isLocal: () => boolean
  isLocalAudioTrack: () => boolean
  getOriginalStream: () => MediaStream
  getStreamId: () => string | null
  getTrack: () => MediaStreamTrack
  getTrackLabel: () => string
  getTrackId: () => string | null
  getUsageLabel: () => string
  attach: (container: HTMLElement) => void
  detach: (container: HTMLElement) => void
  dispose: () => Promise<void>
  getId: () => string | null
  isActive: () => boolean
  setAudioLevel: (audioLevel: number, tpc: TraceablePeerConnection) => void
  getMSID: () => string | null
  setAudioOutput: (audioOutputDeviceId: string) => Promise<void>
}



export { TrackInfo };
export default JitsiTrack
