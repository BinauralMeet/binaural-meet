import {JitsiLocalTrack, JitsiTrack} from 'lib-jitsi-meet'
import {MapObject} from './MapObject'

export interface ParticipantBase extends MapObject{
  id: string
  information: Information
  physics?: Physics
}

export interface RemoteParticipant extends ParticipantBase{
  id: string
  information: Information
  tracks: Tracks
  physics?: Physics
}

export interface LocalParticipant extends ParticipantBase{
  id: string
  information: Information
  tracks: LocalTracks
  physics?: Physics
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

export interface Tracks {
  audio: JitsiTrack | undefined
  avatar: JitsiTrack | undefined
  screen: JitsiTrack | undefined
}
export interface LocalTracks {
  audio: JitsiLocalTrack | undefined
  avatar: JitsiLocalTrack | undefined
  screen: JitsiLocalTrack | undefined
}

export interface Physics {
  onStage: boolean
}
