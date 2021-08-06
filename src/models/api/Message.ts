export const MessageType = {
  REQUEST: 'request',
  ADD_PARTICIPANT: 'add_p',
  REMOVE_PARTICIPANT: 'del_p',
  UPDATE_PARTICIPANT: 'update_p',
  UPDATE_CONTENTS: 'update_c',
  ALL_INFOS: 'all_i',             //  server send when requrested.
  CLEAR: 'clear',                 //  clear server's info.
  ROOMS_TO_SHOW: 'rooms_to_show', //  list rooms to show

  REQUEST_ROOM_PROPS: 'req_room_props',
  ROOM_PROPS: 'room_props',
  ROOM_PROP: 'room_prop',
}

export interface Message {
  t: string,  //  type
  r: string,  //  room id
  p: string,  //  participant id
  v: string,
}
export interface RoomInfo {
  r: string,
  ps: {p:string, v: string}[],
  cs: {p:string, v: string}[]
}
