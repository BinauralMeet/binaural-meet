// Type definitions for [~THE LIBRARY NAME~] [~OPTIONAL VERSION NUMBER~]
// Project: [~THE PROJECT NAME~]
// Definitions by: [~YOUR NAME~] <[~A URL FOR YOU~]>

import JitsiRemoteTrack from "./RTC/JitsiRemoteTrack";
import JitsiTrack from "./RTC/JitsiTrack";
import TraceablePeerConnection from "./RTC/TraceablePeerConnection";
import {BridgeChannel} from "./RTC/BridgeChannel"

declare class Transcriber {
  constructor();

  start(): void;
  stop(callback: Function): void;
  maybeMerge(): void;
  merge(): void;
  updateTransription(word: string, name: string | null): void;
  addTrack(track: JitsiTrack): void;
  removeTrack(track: JitsiTrack): void;
  getTranscription(): string;
  getState(): any;
  reset(): void;
}

interface IStatisticsOptions {
  applicationName: string;
  aliasName: string;
  userName: string;
  callStatsConfIDNamespace: string;
  confID: string;
  callStatsID: string;
  callStatsSecretl: string
  customScriptUrl: string;
  roomName: string;
}

interface IRTCOptions {
  disableAEC: boolean;
  diableNS: boolean;
  diableAP: boolean;
  disableAGC: boolean;
  disableHPF: boolean;
  useIPv6: boolean;
  testing: {
    forceP2PSuspendViudeoRatio: boolean;
  };
  desktopSharingChromeDisabled: boolean;
  desktopSharingChromExtId: boolean;
  desktopSharingFirfoxDisavbled: boolean;
}

declare class RTC{
  peerConnections:Map<number, TraceablePeerConnection>
  localTracks:JitsiTrack[]
  _channel:BridgeChannel|null
}

export { Transcriber, IStatisticsOptions, IRTCOptions, RTC };

