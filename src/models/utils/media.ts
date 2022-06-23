export interface MSTrack{
  track: MediaStreamTrack,
  peer: string,
  role: Roles,
  deviceId?: string,
}
export type Roles = 'avatar' | 'mainScreen' | string
export type TrackKind = 'audio' | 'video'

