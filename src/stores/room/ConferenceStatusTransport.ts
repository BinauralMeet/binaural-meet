import {MSTrack} from '@models/conference/RtcConnection'

// Lets ErrorInfo observe/drive conference connection & local-track status
// without importing @models/conference directly (see ContentSyncTransport.ts
// for the same pattern applied to SharedContents). Conference injects itself
// as the implementation via ErrorInfo.setConferenceStatusTransport().
export interface ConferenceStatusTransport {
  isRtcConnected(): boolean
  isDataConnected(): boolean
  getLocalMicTrack(): MSTrack | undefined
  setLocalMicTrack(track: MSTrack | undefined): Promise<void>
  setLocalCameraTrack(track?: MSTrack): Promise<MSTrack | void>
  addRtcDisconnectListener(cb: () => void): void
  removeRtcDisconnectListener(cb: () => void): void
  isNearestVideoMuted(): boolean
  isNearestAudioMuted(): boolean
  preEnter(room: string): Promise<boolean>
  enter(room: string, token: string | undefined, email: string | undefined): Promise<string>
}
