// Type definitions for [~THE LIBRARY NAME~] [~OPTIONAL VERSION NUMBER~]
// Project: [~THE PROJECT NAME~]
// Definitions by: [~YOUR NAME~] <[~A URL FOR YOU~]>

export as namespace JitsiMeetJS;

import JitsiTrack, { TrackInfo, VideoType, MediaType, TMediaType} from "./modules/RTC/JitsiTrack"
import JitsiLocalTrack from './modules/RTC/JitsiLocalTrack'
import JitsiRemoteTrack from './modules/RTC/JitsiRemoteTrack'
import { JitsiConnection } from './JitsiConnection';
import { JitsiConference, JitsiValues } from "./JitsiConference";

export const version: string;
export const events: JitsiMeetEvents;
export const errors: JitsiMeetErrors;

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
export { JitsiConnection, JitsiConference, JitsiTrack, TrackInfo, JitsiLocalTrack, JitsiRemoteTrack, VideoType, MediaType, TMediaType, JitsiValues, JitisTrackError};



export namespace JitsiConferenceEvents {
  const AUDIO_INPUT_STATE_CHANGE: string;
  const AUTH_STATUS_CHANGED: string;
  const AVATAR_CHANGED: string;
  const BEFORE_STATISTICS_DISPOSED: string;
  const CONFERENCE_ERROR: string;
  const CONFERENCE_FAILED: string;
  const CONFERENCE_JOINED: string;
  const CONFERENCE_LEFT: string;
  const CONNECTION_ESTABLISHED: string;
  const CONNECTION_INTERRUPTED: string;
  const CONNECTION_RESTORED: string;
  const DATA_CHANNEL_OPENED: string;
  const DISPLAY_NAME_CHANGED: string;
  const DOMINANT_SPEAKER_CHANGED: string;
  const CONFERENCE_CREATED_TIMESTAMP: string;
  const DTMF_SUPPORT_CHANGED: string;
  const ENDPOINT_MESSAGE_RECEIVED: string;
  const JVB121_STATUS: string;
  const KICKED: string;
  const PARTICIPANT_KICKED: string;
  const LAST_N_ENDPOINTS_CHANGED: string;
  const LOCK_STATE_CHANGED: string;
  const SERVER_REGION_CHANGED: string;
  const MESSAGE_RECEIVED: string;
  const NO_AUDIO_INPUT: string;
  const NOISY_MIC: string;
  const PRIVATE_MESSAGE_RECEIVED: string;
  const PARTICIPANT_CONN_STATUS_CHANGED: string;
  const PARTCIPANT_FEATURES_CHANGED: string;
  const PARTICIPANT_PROPERTY_CHANGED: string;
  const P2P_STATUS: string;
  const PHONE_NUMBER_CHANGED: string;
  const PROPERTIES_CHANGED: string;
  const RECORDER_STATE_CHANGED: string;
  const VIDEO_SIP_GW_AVAILABILITY_CHANGED: string;
  const VIDEO_SIP_GW_SESSION_STATE_CHANGED: string;
  const START_MUTED_POLICY_CHANGED: string;
  const STARTED_MUTED: string;
  const SUBJECT_CHANGED: string;
  const SUSPEND_DETECTED: string;
  const TALK_WHILE_MUTED: string;
  const TRACK_ADDED: string;
  const TRACK_AUDIO_LEVEL_CHANGED: string;
  const TRACK_MUTE_CHANGED: string;
  const TRACK_REMOVED: string;
  const REMOTE_TRACK_VIDEOTYPE_CHANGING: string;
  const REMOTE_TRACK_VIDEOTYPE_CHANGED: string;
  const TRANSCRIPTION_STATUS_CHANGED: string;
  const USER_JOINED: string;
  const USER_LEFT: string;
  const USER_ROLE_CHANGED: string;
  const USER_STATUS_CHANGED: string;
  const BOT_TYPE_CHANGED: string;
}

export namespace JitsiConnectionEvents {
  const CONNECTION_DISCONNECTED: string;
  const CONNECTION_ESTABLISHED: string;
  const CONNECTION_FAILED: string;
  const WRONG_STATE: string;
}

export interface JitsiMediaDevices{
  setAudioOutputDevice(deviceId: string):void
  getAudioOutputDevice():string
}
export const mediaDevices: JitsiMediaDevices
