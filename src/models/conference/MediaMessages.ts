import * as mediasoup from 'mediasoup-client'
export type MSMessageType =
  'dataConnect' | 'positionConnect' | 'position' |
  'connect' | 'auth' | 'join' | 'pong' | 'rtpCapabilities' | 'leave' |
  'remoteUpdate' | 'remoteLeft' |
  'workerAdd' | 'workerDelete' | 'workerUpdate' |
  'createTransport' | 'closeTransport' | 'connectTransport' |
  'produceTransport' | 'closeProducer' | 'consumeTransport' | 'resumeConsumer' |
  'streamingStart' | 'streamingStop'
export interface MSMessage{
  type: MSMessageType
  sn?: number
}
export interface MSPeerMessage extends MSMessage{
  peer: string
  remote?: string
}
export interface MSAuthMessage extends MSPeerMessage{
  room: string
  email: string
  error?: string
}
export interface MSConnectMessage extends MSPeerMessage{
  peerJustBefore?: string
}
export type MSTrackRole = 'camera' | 'mic' | 'window' | string
export interface MSRemoteProducer{
  id: string                      //  producer id
  role: MSTrackRole               //  role of track for this producer
  kind: mediasoup.types.MediaKind //  kind of this producer
}
export function isEqualMSRP(a:MSRemoteProducer, b:MSRemoteProducer){
  return a.kind === b.kind && a.role === b.role
}

export interface MSRemotePeer{
  peer: string
  producers: MSRemoteProducer[]   // producers of the remote peer
}

export interface MSRemoteUpdateMessage extends MSMessage{
  remotes: MSRemotePeer[]
}
export interface MSRemoteLeftMessage extends MSMessage{
  remotes: string[]
}

export interface MSRoomMessage extends MSPeerMessage{
  room: string
}
export interface MSWorkerUpdateMessage extends MSPeerMessage{
  load: number
}

export interface MSRTPCapabilitiesReply extends MSPeerMessage{
  rtpCapabilities: mediasoup.types.RtpCapabilities
}

//  direction see from clients
export type MSTransportDirection = 'send' | 'receive'
//  c->s
export interface MSCreateTransportMessage extends MSPeerMessage{
  dir: MSTransportDirection
}
//  s->c
export interface MSCreateTransportReply extends MSPeerMessage{
  transport: string
  iceParameters:mediasoup.types.IceParameters
  iceCandidates:mediasoup.types.IceCandidate[]
  dtlsParameters:mediasoup.types.DtlsParameters
  dir: MSTransportDirection
  iceServers?: RTCIceServer[]
}

export interface MSConnectTransportMessage extends MSPeerMessage{
  transport: string,
  dtlsParameters: mediasoup.types.DtlsParameters,
}
export interface MSConnectTransportReply extends MSPeerMessage{
  error: string
}

export interface MSProduceTransportMessage extends MSPeerMessage{
  transport: string
  role: MSTrackRole
  kind: mediasoup.types.MediaKind
  rtpParameters: mediasoup.types.RtpParameters,
  paused?: boolean
}
export interface MSProduceTransportReply extends MSPeerMessage{
  producer?: string
  role: MSTrackRole
  kind: mediasoup.types.MediaKind
  error?:string
}

export interface MSCloseProducerMessage extends MSPeerMessage{
  producer: string
}
export interface MSCloseProducerReply extends MSPeerMessage{
  error?: string
}

export interface MSConsumeTransportMessage extends MSPeerMessage{
  transport: string
  producer: string
  rtpCapabilities: mediasoup.types.RtpCapabilities,
}
export interface MSConsumeTransportReply extends MSPeerMessage{
  consumer?: string
  producer?: string
  kind?: mediasoup.types.MediaKind
  rtpParameters?: mediasoup.types.RtpParameters
  error?:string
}

export interface MSResumeConsumerMessage extends MSPeerMessage{
  consumer: string
}
export interface MSResumeConsumerReply extends MSPeerMessage{
  error?: string
}

export interface MSCloseTransportMessage extends MSMessage{
  transport: string,
}

export interface MSStreamingStartMessage extends MSPeerMessage{
  id: string
  producers: string[]
}
export interface MSStreamingStopMessage extends MSPeerMessage{
  id: string
}

export interface MSPositionConnectMessage extends MSPeerMessage{
  id: string
  name: string
  room: string
}
export interface MSPositionMessage extends MSMessage{
  position: number[]
  orientation: number
}
