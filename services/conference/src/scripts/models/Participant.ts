import {JitsiLocalTrack, JitsiTrack} from 'lib-jitsi-meet'
import {MapObject} from './MapObject'

export const PARTICIPANT_SIZE = 50
export interface ParticipantBase extends MapObject{
  id: string
  information: Information
  physics: Physics
  tracks: Tracks
  mousePosition: [number, number] | undefined
}

export interface RemoteParticipant extends ParticipantBase {
}

export interface LocalParticipant extends ParticipantBase {
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

export interface Tracks {
  audio: JitsiTrack | undefined
  avatar: JitsiTrack | undefined
  audioStream: MediaStream | undefined
  avatarStream: MediaStream | undefined
}
export interface Physics {
  onStage: boolean
}
export const defaultPhysics: Physics = {
  onStage: false,
}
