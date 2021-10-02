export interface BMMessage {
  t: string,  //  type
  r?: string,  //  room id
  p?: string,  //  source pid
  d?: string,  //  distination pid
  v: string,  //  JSON value
}
export interface ObjectArrayMessage{
  id: string
}
