import {JitsiTrack} from 'lib-jitsi-meet'
import {MapObject} from './MapObject'

export const PARTICIPANT_SIZE = 60

export interface ParticipantInfo {
  id: string
  name: string
  avatarSrc: string
  colors: string[]
}

export interface ParticipantBase extends MapObject{
  physics: Physics
  tracks: Tracks
  mouse: Mouse
  id: string
  information: RemoteInformation|LocalInformation
  awayFromKeyboard: boolean
}

export interface RemoteParticipant extends ParticipantBase {
  informationReceived: boolean
}

export type SoundLocalizationBase = 'avatar' | 'user'
export interface LocalParticipant extends ParticipantBase {
  soundLocalizationBase: SoundLocalizationBase
  information: LocalInformation
}
export type Participant = LocalParticipant | RemoteParticipant

export interface RemoteInformation {
  name: string
  avatarSrc: string
  color: number[]
  textColor: number[]
}
export interface LocalInformation extends RemoteInformation {
  email: string
  notifyCall: boolean
  notifyTouch: boolean
  notifyNear: boolean
  notifyYarn: boolean
}
export const defaultInformation:LocalInformation = {
  name: 'Anonymous',
  email: '',
  avatarSrc: '',
  color: [],
  textColor: [],
  notifyCall: true,
  notifyTouch: false,
  notifyNear: false,
  notifyYarn: false,
}
export const defaultRemoteInformation:RemoteInformation = {
  name: '',
  avatarSrc: '',
  color: [],
  textColor: [],
}
export interface Tracks {
  audio: JitsiTrack | undefined
  avatar: JitsiTrack | undefined
  audioStream: MediaStream | undefined
  avatarStream: MediaStream | undefined
}

export interface TrackStates{
  micMuted: boolean,
  speakerMuted: boolean,
  headphone: boolean,
}
export interface Physics {
  located: boolean
  onStage: boolean
}
export const defaultPhysics: Physics = {
  located: true,
  onStage: false,
}

export interface Mouse{
  position:[number, number]
  show: boolean
}
