export const StoredMessageType = {
  PARTICIPANT_POSE: 'mp',                       //  -> update presence once per 5 sec / message immediate value
  PARTICIPANT_MOUSE: 'mm',                      //  -> message
  PARTICIPANT_AFK: 'p_afk',                     //
  PARTICIPANT_INFO: 'p_info',                   //  -> presence
  PARTICIPANT_PHYSICS: 'p_physics',             //  -> presence
  PARTICIPANT_TRACKSTATES: 'p_trackstates',     //  -> presence
  MAIN_SCREEN_CARRIER: 'main_screen_carrier',   //  -> presence
  MY_CONTENT: 'my_content',                     //  -> presence, only when no bmRelayServer
}
export type StoredMessageKeys = keyof typeof StoredMessageType

export const InstantMessageType = {
  CHAT_MESSAGE: 'm_chat',                       //  -> text chat message
  PARTICIPANT_TRACKLIMITS: 'm_track_limits',    //  -> message, basically does not sync
  YARN_PHONE: 'YARN_PHONE',                     //  -> message
  CALL_REMOTE: 'call_remote',                   //  -> message, to give notification to a remote user.
  MUTE_VIDEO: 'm_mute_video',                   //  ask to mute video
  MUTE_AUDIO: 'm_mute_audio',                   //  ask to mute audio
  RELOAD_BROWSER: 'm_reload',                   //  ask to reload browser
  KICK: 'm_kick',
}
export type InstantMessageKeys = keyof typeof InstantMessageType

export const AccumuratingMessageType = {
  //  contents
  CONTENT_UPDATE_REQUEST: 'c_update',     //  -> message
  CONTENT_REMOVE_REQUEST: 'c_remove',     //  -> message
  CONTENT_UPDATE_REQUEST_BY_ID:  'c_update_by_id',
  LEFT_CONTENT_REMOVE_REQUEST: 'left_c_remove',     //  -> message, only when no bmRelayServer
  CONTENT_INFO_UPDATE: 'c_info_update',   //  only for bmRelayServer to clients.
}
export type accumuratingMessageKeys = keyof typeof AccumuratingMessageType

export const MessageType = {
  ...InstantMessageType,
  ...StoredMessageType,
  ...AccumuratingMessageType,

  //  special
  REQUEST_ALL: 'req_all',                       //  request all stored information
  REQUEST_TO: 'req_to',                         //  request for info of specific participant
  REQUEST_RANGE: 'req_range',                   //  request updated message related to the range
  PARTICIPANT_LEFT: 'm_participant_left',       //  -> remove info
  ROOM_PROP:  'room_prop',                      //  set room property

  //  only for JVB
  FRAGMENT_HEAD: 'frag_head',
  FRAGMENT_CONTENT: 'frag_cont',
}
export type MessageKeys = keyof typeof MessageType
