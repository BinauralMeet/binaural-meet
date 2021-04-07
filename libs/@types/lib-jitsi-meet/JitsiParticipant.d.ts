// Type definitions for [~THE LIBRARY NAME~] [~OPTIONAL VERSION NUMBER~]
// Project: [~THE PROJECT NAME~]
// Definitions by: [~YOUR NAME~] <[~A URL FOR YOU~]>

import { JitsiConference } from "./JitsiConference";
import JitsiTrack from './modules/RTC/JitsiTrack'
import { TMediaType } from "./modules/RTC/JitsiTrack";

declare class JitsiParticipant {
  constructor(
    jid: string,
    conference: JitsiConference,
    displayName: string,
    hidden: boolean,
    statsID: string,
    status: any,
    identity: Object,
  );

  getConference: () => JitsiConference
  getProperty: (name: string) => any
  hasAnyVideoTrackWebRTCMuted: () => boolean
  getConnectionStatus: () => string
  setProperty: (name: string, value: any) => void
  getTracks: () => JitsiTrack[]
  getTracksByMediaType: (mediaType: TMediaType) => JitsiTrack[]
  getId: () => string
  getJid: () => string
  getDisplayName: ()=> string
  getStatsID: () => string
  getStatus: () => string
  isModerator: () => boolean
  isHidden: () => boolean
  isAudioMuted: () => boolean
  isVideoMuted: () => boolean
  getRole: () => string
  supportsDTMF: () => boolean
  getFeatures: (timeout: number) => Promise<Set<string>>
  getBotType: () => string | undefined
}

export default JitsiParticipant;

