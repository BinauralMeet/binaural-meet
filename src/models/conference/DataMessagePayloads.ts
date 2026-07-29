//  Client-only: maps each MessageType wire value to its actual payload shape (the JSON value
//  encoded in BMMessage.v), promoting what used to be documented only as inline comments in
//  DataMessageType.ts into real, compiler-checked types. Not part of the copied/shared file family
//  (see getSourceFromBM.sh) -- several of these types (ChatMessageToSend, RemoteInformation, ...)
//  are client-only concerns the server never needs to interpret.
//
//  Shapes below were verified against actual send/receive call sites, not just the (sometimes
//  stale) inline comments in DataMessageType.ts -- e.g. CALL_REMOTE's comment says "pid:string"
//  but it's actually sent with an empty object (the recipient is `msg.p`/`dest`, not `msg.v`), and
//  PARTICIPANT_LEFT_BY_ERROR's comment says "id:string" but the server actually sends
//  {errorType, code, reason}.
import {RemoteInformation, TrackStates, Viewpoint} from '@models/Participant'
import {ISharedContent, ISharedContentToSend} from '@models/ISharedContent'
import {ChatMessageToSend} from '@stores/room/Chat'
import {VrmRig} from '@models/utils/vrmIK'
import {MessageType} from './DataMessageType'

export interface MessageTypePayloadMap {
  [MessageType.PARTICIPANT_AFK]: boolean
  [MessageType.PARTICIPANT_TRACKSTATES]: TrackStates
  [MessageType.PARTICIPANT_VIEWPOINT]: Viewpoint
  [MessageType.PARTICIPANT_RECORDING]: boolean
  [MessageType.PARTICIPANT_POSE]: string          //  pose2Str()-encoded, see coordinates.ts
  [MessageType.PARTICIPANT_MOUSE]: string         //  mouse2Str()-encoded, see coordinates.ts
  [MessageType.PARTICIPANT_ON_STAGE]: boolean
  [MessageType.PARTICIPANT_INFO]: RemoteInformation
  [MessageType.PARTICIPANT_VRMRIG]: VrmRig
  [MessageType.PARTICIPANT_TRACKLIMITS]: number[]
  [MessageType.YARN_PHONE]: string[]              //  connected pids
  [MessageType.CHAT_MESSAGE]: ChatMessageToSend
  [MessageType.CALL_REMOTE]: Record<string, never>  //  recipient is msg.d, not the payload
  [MessageType.MUTE_VIDEO]: boolean
  [MessageType.MUTE_AUDIO]: boolean
  [MessageType.AUDIO_LEVEL]: number
  [MessageType.RELOAD_BROWSER]: undefined         //  never actually sent (see comment in DataMessageType.ts)
  [MessageType.KICK]: string                      //  reason
  [MessageType.CONTENT_UPDATE_REQUEST]: ISharedContentToSend[]
  [MessageType.CONTENT_INFO_UPDATE]: ISharedContent[]
  [MessageType.CONTENT_REMOVE_REQUEST]: string[]  //  cids
  [MessageType.PARTICIPANT_OUT]: string[]         //  pids
  [MessageType.MOUSE_OUT]: string[]               //  pids
  [MessageType.CONTENT_OUT]: string[]             //  cids
  [MessageType.CONTENT_UPDATE_REQUEST_BY_ID]: string[]  //  cids
  [MessageType.REQUEST_ALL]: Record<string, never>
  [MessageType.REQUEST_RANGE]: [number[], number[]]  //  [visibleArea rect, audibleArea circle]
  [MessageType.REQUEST_PARTICIPANT_STATES]: string[]  //  pids
  [MessageType.PARTICIPANT_LEFT]: string[]        //  ids
  [MessageType.PARTICIPANT_LEFT_BY_ERROR]: {errorType: string, code: number, reason: string}
  [MessageType.ROOM_PROP]: [string, string | undefined]  //  [propertyName, value]
  [MessageType.REQUEST_TO]: string[]              //  pids
  [MessageType.PONG]: undefined                   //  wire value is the literal empty string '', not JSON
}

export function parseMessageValue<T extends keyof MessageTypePayloadMap>(
  type: T, v: string
): MessageTypePayloadMap[T]{
  return JSON.parse(v)
}

export function stringifyMessageValue<T extends keyof MessageTypePayloadMap>(
  _type: T, value: MessageTypePayloadMap[T]
): string{
  return JSON.stringify(value)
}
