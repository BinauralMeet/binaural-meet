// Type definitions for [~THE LIBRARY NAME~] [~OPTIONAL VERSION NUMBER~]
// Project: [~THE PROJECT NAME~]
// Definitions by: [~YOUR NAME~] <[~A URL FOR YOU~]>

import { JitsiConnection } from "./JitsiConnection";
import JitsiTrack, {TMediaType} from "./modules/RTC/JitsiTrack";
import JitsiLocalTrack from './modules/RTC/JitsiLocalTrack'
import JitsiParticipant from "./JitsiParticipant";
import { Transcriber } from "./modules";
import TraceablePeerConnection from "./modules/RTC/TraceablePeerConnection";

declare interface JitsiValuesChildren {
  tagName:string
  value:string
  attributes: {}
  children: Array<JitsiValuesChildren>
}
declare interface JitsiValues {
  value:string
  attributes: {}
  children: Array<JitsiValuesChildren>
}
declare class JingleSessionPC{
  bitRateAlreadyReduced?: boolean
  peerconnection: TraceablePeerConnection
}
declare class JitsiConference {
  constructor(options: any);

  static resourceCreator(jid: string, isAuthenticatedUser: boolean): string;

  join(password: string): void;
  // TODO: add details.
  authenticateAndUpgradeRole(options: any): Object;
  isJoined(): boolean;
  isP2PEnabled(): boolean;
  isP2PTestModeEnabled(): boolean;
  // TODO: add details.
  leave(): Promise<any>;
  getName(): string;
  getConnection(): JitsiConnection;
  isAuthEnabled(): boolean;
  isLoggedIn(): boolean;
  // TODO: add details.
  getAuthLogin(): Object;
  isExternalAuthEnabled(): boolean;
  getExternalAuthUrl(urlForPopup: boolean): Promise<any>;
  getLocalTracks(mediaType: TMediaType): JitsiLocalTrack[];
  getLocalAudioTrack(): JitsiLocalTrack | null;
  getLocalVideoTrack(): JitsiLocalTrack | null;
  on(eventId: string, handler: Function): void;
  off(eventId: string, handler: Function): void;
  addEventListener: (eventId: number, handler: Function) => void;
  removeEventListener: (eventId: number, handler: Function) => void;
  addCommandListener(command: string, handler: (values: JitsiValues, jid:string, from:any) => void): void;
  removeCommandListener(command: string, handler: (values: JitsiValues) => void): void;
  sendCommand(name: string, values: JitsiValues): void;
  sendCommandOnce(name: string, values: JitsiValues): void;
  removeCommand(name: string): void;
  setDisplayName(name: string): void;
  setSubject(subject: string): void;
  getTranscriber(): Transcriber;
  getTranscriptionStatus(): 'on' | 'off';
  addTrack(track: JitsiLocalTrack): Promise<JitsiLocalTrack>;
  onLocalTrackRemoved(track: JitsiTrack): void;
  removeTrack(track: JitsiLocalTrack): Promise<any>;
  replaceTrack(oldTrack: JitsiLocalTrack|null, newTrack: JitsiLocalTrack|null): Promise<any>;
  getRole(): string;
  isHidden(): boolean | null;
  isModerator(): boolean | null;
  lock(password: string): Promise<any>;
  unlock(): Promise<any>;
  selectParticipant(participantId: string): void;
  selectParticipants(participantIds: string[]): void;
  pinParticipant(participantId: string): void;
  getLastN(): number;
  setLastN(lastN: number): void;
  getParticipants(): JitsiParticipant[];
  getParticipantCount(countHidden: boolean): number;
  getParticipantById(id: string): JitsiParticipant;
  kickParticipant(id: string): void;
  muteParticipant(id: string): void;
  // onMemberJoined(jid: string, nick: string, role: string, isHidden: boolean, statsID: string, status: any, identity: any, botType: any): void;
  isDTMFSupported(): boolean;
  myUserId(): string;
  sendTones(tones: any, duration: any, pause: any): void;
  startRecording(options: any): Promise<any>;
  stopRecording(sessionId: string): Promise<any>;
  isSIPCallingSupported(): boolean;
  dial(number: number): Promise<any>;
  hangup(number: number): Promise<any>;
  startTranscriber(): Promise<any>;
  stopTranscriber: (number: number) => Promise<any>;
  getPhoneNumber(): string | null;
  getPhonePin(): string | null;
  getMeetingUniqueId(): string | undefined;
  // getActivePeerConnection(): TraceablePeerConnection | null;
  getConnectionState(): string | null;
  setStartMutedPolicy(policy: { audio: boolean, video: boolean }): void;
  getStartMutedPolicy(): { audio: boolean, video: boolean };
  isStartAudioPolicy(): boolean;
  isStartVideoPolicy(): boolean;
  getLogs(): Object;
  getConnectionTimes(): number;
  setLocalParticipantProperty(name: string, value: Object): void;
  removeLocalParticipantProperty(name: string): void;
  getLocalParticipantProperty(name: string): any;
  sendFeedback(overallFeedback: number, detailedFeedback: any): Promise<any>;
  isCallStatsEnabled(): boolean;
  sendApplicationLog(message: string): void;
  sendEndpointMessage(to: string, payload: Object): void;
  broadcastEndpointMessage(payload: Object): void;

  sendMessage(message: string, to: string, sendThroughVideobridge: boolean): void;
  getProperty(key: string): any;
  isP2PActive(): boolean;
  getP2PConnectionState(): string | null;

  jvbJingleSession:JingleSessionPC
}

export { JitsiValues, JitsiValuesChildren};
export { JitsiConference };
