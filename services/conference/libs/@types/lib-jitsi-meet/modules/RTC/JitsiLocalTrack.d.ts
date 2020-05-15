import JitsiTrack, { TrackInfo } from "./JitsiTrack"


declare class JitsiLocalTrack extends JitsiTrack {
  constructor(trackInfo: TrackInfo);

  isEnded: ()=> boolean
  setEffect: (effect: Object) => Promise<any>
  mute: ()=> Promise<any>
  unmute: ()=> Promise<any>
  dispose: ()=>Promise<any>
  isMuted:()=>boolean
  isLocal:()=>true
  getDeviceId:()=> string
  getParticipantId:()=>string
  getCameraFacingMode:()=>any | undefined
  stopStream: () => void
  isReceivingData:() => boolean
  toString:() => string
}

export default JitsiLocalTrack
