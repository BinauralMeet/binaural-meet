//  messages forward only when participants are in the range.
export const ParticipantMessageType = {
  PARTICIPANT_AFK: 'p_afk',                     //  boolean
  PARTICIPANT_TRACKSTATES: 'p_trackSt',         //  TrackStates
  PARTICIPANT_VIEWPOINT: 'p_viewpoint',         //  Viewpoint
}
export type ParticipantMessageKeys = keyof typeof ParticipantMessageType

export const PoseMessageType = {
  PARTICIPANT_POSE: 'mp',                       //  special text, -> presence and message
  PARTICIPANT_MOUSE: 'mm',                      //  special text, -> presence and message
  PARTICIPANT_ON_STAGE: 'p_onStage',            //  boolean
}

export const StoredMessageType = {
  ...ParticipantMessageType,
  PARTICIPANT_INFO: 'p_info',                   //  RemoteInformation, -> presence
  MAIN_SCREEN_CARRIER: 'main_screen_carrier',   //  {carrierId, enabled} -> presence
  MY_CONTENT: 'my_content',                     //  ISharedContent[] -> presence, used only when no bmRelayServer exist
}

export type StoredMessageKeys = keyof typeof StoredMessageType

export const InstantMessageType = {
  PARTICIPANT_TRACKLIMITS: 'm_track_limits',    //  [number, number], message, Usually not used.
  YARN_PHONE: 'YARN_PHONE',                     //  pids[] -> message
  CHAT_MESSAGE: 'm_chat',                       //  ChatMessageToSend, -> text chat message
  CALL_REMOTE: 'call_remote',                   //  pid:string, give notification to a remote user.
  MUTE_VIDEO: 'm_mute_video',                   //  boolean, ask to mute video
  MUTE_AUDIO: 'm_mute_audio',                   //  boolean, ask to mute audio
  RELOAD_BROWSER: 'm_reload',                   //  not used, ask to reload browser
  KICK: 'm_kick',                               //  reason:string
}
export type InstantMessageKeys = keyof typeof InstantMessageType
export const InstantMessageTypes = new Set(Object.values(InstantMessageType))


//  messages which can be merged.
export const ObjectArrayMessageType = {
  CONTENT_UPDATE_REQUEST: 'c_update',     //  IShraedContent[]
  CONTENT_INFO_UPDATE: 'c_info_update',   //  SharedContentInfo[], only bmRelayServer to clients.
}
export const ObjectArrayMessageTypes = new Set(Object.values(ObjectArrayMessageType))

export const StringArrayMessageType = {
  LEFT_CONTENT_REMOVE_REQUEST: 'left_c_remove',   //  ids:string[], only when no bmRelayServer
  CONTENT_REMOVE_REQUEST: 'c_remove',             //  ids:string[]
  PARTICIPANT_OUT: 'p_out',                       //  ids:stirng[], server to client only
  MOUSE_OUT: 'm_out',                             //  ids:stirng[], server to client only
  CONTENT_OUT: 'c_out',                           //  ids:stirng[], server to client only
}
export const StringArrayMessageTypes = new Set(Object.values(StringArrayMessageType))

export const ClientToServerOnlyMessageType = {
  CONTENT_UPDATE_REQUEST_BY_ID: 'c_update_by_id', //  cids:string[],
  REQUEST_ALL: 'req_all',                       //  request all stored information
  REQUEST_RANGE: 'req_range', //  rect:number[4], circle:number[3]. request updated message related to the range
  REQUEST_PARTICIPANT_STATES: 'req_p_state',    //  -> message, to get states to display participant
}

export const MessageType = {
  ...ObjectArrayMessageType,
  ...StringArrayMessageType,
  ...InstantMessageType,
  ...StoredMessageType,
  ...PoseMessageType,
  ...ClientToServerOnlyMessageType,

  //  special
  PARTICIPANT_LEFT: 'm_participant_left',       //  id:string,  remove info
  ROOM_PROP:  'room_prop',                      //  [name:string, value:string], set room property
  REQUEST_TO: 'req_to',                         //  ids:string[], request for info of specific participant

  //  only for JVB
  FRAGMENT_HEAD: 'frag_head',
  FRAGMENT_CONTENT: 'frag_cont',
}
export type MessageKeys = keyof typeof MessageType
