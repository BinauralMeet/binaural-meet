import * as mediasoup from 'mediasoup-client'

export type MessageType = 'connect' | 'join' | 'leave' |
  'addWorker' | 'deleteWorker' | 
  'createTransport' | 'connectTransport' | 'closeTransport' |
  'transportCreated'
export interface Message{
  type: MessageType
  peer: string
}
export interface RoomMessage extends Message{
  room: string
}
//  c->s
export interface CreateTransportMessage extends Message{
  direction: string
}
//  s->c
export interface TransportCreatedMessage extends Message{
  id: string,
  iceParameters:mediasoup.types.IceParameters, 
  iceCandidates:mediasoup.types.IceCandidate,
  dtlsParameters:mediasoup.types.DtlsParameters
}

export interface ConnectTransportMessage extends Message{
  transportId: string,
  dtlsParameters: mediasoup.types.DtlsParameters,
}
export interface CloseTransportMessage extends Message{
  transportId: string,
}
