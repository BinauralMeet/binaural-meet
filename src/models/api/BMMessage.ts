export interface BMMessage {
  t: string,  //  type
  r?: string,  //  room id
  p?: string,  //  source pid
  d?: string,  //  distination pid
  v: string,  //  JSON value
}
/*  Client's message request has rectangle ranges for video and audio.
    Messages only overlap with the range and updated since last sent time are sent to client.
*/
