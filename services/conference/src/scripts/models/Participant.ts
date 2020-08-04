import {JitsiLocalTrack, JitsiTrack} from 'lib-jitsi-meet'
import {MapObject} from './MapObject'

export const PARTICIPANT_SIZE = 50
export interface ParticipantBase extends MapObject{
  id: string
  information: Information
  physics: Physics
  tracks: Tracks<JitsiTrack>
}

export interface RemoteParticipant extends ParticipantBase {
}

export interface LocalParticipant extends ParticipantBase {
  tracks: Tracks<JitsiLocalTrack>
}

export interface Pose3DAudio {  // right hand cartesian coordinate system
  position: [number, number, number],
  orientation: [number, number, number],
}

export interface Information {
  name: string
  email?: string
  md5Email?: string
  avatarSrc?: string
}
export const defaultInformation:Information = {
  name: 'Anonymous',
  email: '',
  md5Email: '',
  avatarSrc: '',
}

export interface Tracks<T extends JitsiTrack> {
  audio: T | undefined
  avatar: T | undefined
  audioStream: MediaStream | undefined
  avatarStream: MediaStream | undefined
}
export interface Physics {
  onStage: boolean
}
export const defaultPhysics: Physics = {
  onStage: false,
}
