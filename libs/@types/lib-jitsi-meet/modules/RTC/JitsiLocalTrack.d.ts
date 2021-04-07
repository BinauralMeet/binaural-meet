import JitsiTrack, { TrackInfo } from "./JitsiTrack"
import { JitsiConference } from "../../JitsiConference"


declare class JitsiLocalTrack extends JitsiTrack {
  constructor(trackInfo: TrackInfo);
  conference:JitsiConference
  rtcId:number
  sourceId:number
  sourceType:string
  deviceId:string

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
