import JitsiLocalTrack from './JitsiLocalTrack'
import JitsiRemoteTrack from './JitsiRemoteTrack'

declare class TPCGroupInfo{
  semantics: string
  ssrcs:number[]
}
declare class TPCSSRCInfo{
  ssrcs:number[]
  groups:TPCGroupInfo[]
}

declare class TraceablePeerConnection {
  peerconnection?: RTCPeerConnection
  localTracks: Map<number, JitsiLocalTrack>
  remoteTrackMaps: Map<string, Map<string, JitsiRemoteTrack>>
  localSSRCs: Map<number, TPCSSRCInfo>
  getLocalSSRC(localTrack: JitsiLocalTrack):number
}

export default TraceablePeerConnection
