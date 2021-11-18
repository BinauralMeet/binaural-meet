// Type definitions for [~THE LIBRARY NAME~] [~OPTIONAL VERSION NUMBER~]
// Project: [~THE PROJECT NAME~]
// Definitions by: [~YOUR NAME~] <[~A URL FOR YOU~]>

export as namespace JitsiMeetJS;

import JitsiTrack, { TrackInfo, VideoType, MediaType, TMediaType, JitsiTrackEvents} from "./modules/RTC/JitsiTrack"
import JitsiLocalTrack from './modules/RTC/JitsiLocalTrack'
import JitsiRemoteTrack from './modules/RTC/JitsiRemoteTrack'
import { JitsiConnection } from './JitsiConnection';
import { JitsiConference, JitsiValues, VideoConstraints, BMPerceptibles} from "./JitsiConference"

export const version: string;
export const events: JitsiMeetEvents;
export const errors: JitsiMeetErrors;

declare class BrowserCapabilities{
  constructor()
  supportsP2P(): boolean
  isChromiumBased(): boolean
  isSupported(): boolean
  isUserInteractionRequiredForUnmute(): boolean
  usesPlanB():boolean
  usesUnifiedPlan(): boolean
}
export const browser: BrowserCapabilities

interface ProxyConnectionService { }

interface ParticipantConnectionStatus { }

interface JitsiTranscriptionStatus { }
interface JitsiMeetConstants {
  participantconnectionStatus: ParticipantConnectionStatus;
  recording: any;
  sipVideoGW: any;
  transcriptionStatus: JitsiTranscriptionStatus;
}

interface JitsiMeetEvents {
  conference: typeof JitsiConferenceEvents;
  connection: typeof JitsiConnectionEvents;
  detection: any;
  track: any;
  mediaDevices: any;
  connectionQuality: any;
  e2eping: any;
}

interface JitsiMeetErrors {
  conference: any;
  connection: any;
  track: any;
}


export interface IJitsiMeetJSOptions {
  useIPv6: boolean;
  desktopSharingChromeExtId: string;
  desktopSharingChromeDisabled: boolean;
  desktopSharingChromeSources: Array<string>;
  desktopSharingChromeMinExtVersion: string;
  desktopSharingFirefoxDisabled: boolean;
  disableAudioLevels: boolean;
  disableSimulcast: boolean;
  enableWindowOnErrorHandler: boolean;
  disableThiredPartyRequests: boolean;
  enableAnalyticsLogging: boolean;
  callStatsCustionScriptUrl?: string;
  callStatsConfIDNamespace?: string;
  disableRtx?: boolean;
  disableH264?: boolean;
  preferH264?: boolean;
  desktopSharingFrameRate:{
    min:  number,
    max:  number,
  },
}

export interface JitsiTrackOptions {
  devices: string[];
  resolution?: string;
  constraints?: any;
  cameraDeviceId?: string;
  micDeviceId?: string;
  minFps?: string;
  maxFps?: string;
  facingMode?: 'user' | 'environment'
}

interface JitisTrackError{
  name: string
  message: string
  stack: string
  gum: {
    error:any
    constraints:JitsiTrackOptions,
    devices: any[]
  }
}

export function init(options?: IJitsiMeetJSOptions): void;
export function setLogLevel(level: any): void;
export function createLocalTracks(options?: JitsiTrackOptions, firePermissionPromptIsShownEvent?: boolean): Promise<Array<JitsiLocalTrack>>;
export { JitsiConnection, JitsiConference, JitsiTrack, TrackInfo, JitsiLocalTrack, JitsiRemoteTrack,
   VideoType, MediaType, TMediaType, JitsiValues, JitisTrackError, JitsiTrackEvents, VideoConstraints, BMPerceptibles};
export interface JitsiMediaDevices{
  setAudioOutputDevice(deviceId: string):void
  getAudioOutputDevice():string
}
export const mediaDevices: JitsiMediaDevices
