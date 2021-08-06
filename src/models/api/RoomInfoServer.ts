import { assert } from '@models/utils'
import {Message, MessageType} from './RoomInfoMessage'

declare const config:any                  //  from ../../config.js included from index.html

export class RoomInfoServer{
  roomProps:Map<string, string> = new Map()

  ws: WebSocket|undefined
  onopen: ((ws: WebSocket)=>void)|undefined = undefined
  constructor(url: string, roomName: string){
    if (!url){
      console.error('url for roomInfoServer must be specified.')
    }
    this.ws = new WebSocket(url)
    const onmessage = (ev: MessageEvent<any>)=>{
      const msg = JSON.parse(ev.data) as Message
      this.onMessage(msg.t, msg.r, msg.p, JSON.parse(msg.v))
    }
    this.ws.onmessage = onmessage
    this.ws.onopen = () => {
      if (this.onopen){ this.onopen(this.ws!) }
      this.send(MessageType.REQUEST_ROOM_PROPS, roomName, '', '')
    }
    const onclose = (ev: CloseEvent) => {
      this.ws = new WebSocket(url)
      this.ws.onmessage = onmessage
      this.ws.onclose = onclose
    }
    this.ws.onclose = onclose
  }
  send(type: string, roomName: string, pid: string, value: any){
    if (this.ws){
      this.ws.send(JSON.stringify({t:type, r:roomName, p:pid, v:JSON.stringify(value)}))
    }
  }

  onMessage(type:string, room:string, pid: string, value:any){
    if (type === MessageType.ROOM_PROPS){
      const props = value as [string, string][]
      this.roomProps = new Map(props)
    }else if (type === MessageType.ROOM_PROP){
      const prop = value as [string, string]
      this.roomProps.set(prop[0], prop[1])
    }
  }
}

export function connectRoomInfoServer(roomName: string){
  if (!config.roomInfoServer){
    console.error('roomInfoServer must be specified.')
    assert(config.roomInfoServer)
  }
  const roomInfoServer = new RoomInfoServer(config.roomInfoServer, roomName)

  return roomInfoServer
}
