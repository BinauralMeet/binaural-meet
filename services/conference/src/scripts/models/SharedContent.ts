import {MapObject, Pose2DMap} from './MapObject'

export type ContentType = 'img' | 'text' | 'youtube' | 'iframe' | 'screen' | 'camera' | 'gdrive' | ''

export interface SharedContentData {
  zorder: number                  //  unix timestamp when shared or moved to top.
  name: string                    //  name or title of the content.
  ownerName: string               //  name of the initial owner
  type: ContentType               //  content type ('img', etc)
  url: string                     //  url or text to share
  pose: Pose2DMap                 //  position and orientation
  size: [number, number]          //  current size of the content
  originalSize: [number, number]  //  original size of the content or [0, 0]
  pinned: boolean                 //  pinned (not resizable or resizable)
}
export interface SharedContentId{
  id: string                      //  unique ID (generated by participant id + number)
}
export interface SharedContentMethods{
  isEditable(): boolean           //  editable or not
  isBackground(): boolean         //  background or not
  moveToTop(): void               //  change zorder to the top.
  moveToBottom(): void            //  change zorder to the bottom.
  moveToBackground(): void        //  change zorder to far below the bottom.
}
export interface SharedContent extends MapObject, SharedContentData, SharedContentId, SharedContentMethods {
}

export interface BackgroundContents {
  room: string
  contents: SharedContentData[]
}

export interface TextMessage {
  message: string, //  text to display
  name: string, //  The name of whom create this text
  pid: string,  //  The pid of whom create this text
  time: number, //  Timestamp when this message created.
}
export interface TextMessages {
  messages: TextMessage[]
  scroll: [number, number]
}

export function compTextMessage(t1: TextMessage, t2: TextMessage) {
  return t1.time - t2.time
}
