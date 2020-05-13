// Type definitions for [~THE LIBRARY NAME~] [~OPTIONAL VERSION NUMBER~]
// Project: [~THE PROJECT NAME~]
// Definitions by: [~YOUR NAME~] <[~A URL FOR YOU~]>

import { EventEmitter } from "events";

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
}



export { TrackInfo };
export default JitsiTrack
