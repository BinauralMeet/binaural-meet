export interface MSTrack{
  track: MediaStreamTrack,
  peer: string,
  role: Roles | string,
  deviceId?: string,
}
export type Roles = 'mic' | 'camera' | 'desktop'
