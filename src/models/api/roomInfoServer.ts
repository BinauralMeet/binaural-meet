import {SharedContent as ISharedContent} from '@models/SharedContent'
import {urlParameters} from '@models/url'
import { assert } from '@models/utils'
import { ParticipantBase } from '@stores/participants/ParticipantBase'
import rooms from '@stores/Rooms'
import { random } from 'lodash'
import {Message, MessageType, RoomInfo} from './Message'

declare const config:any                  //  from ../../config.js included from index.html

export class RoomInfoServer{
  ws: WebSocket|undefined
  onopen: ((ws: WebSocket)=>void)|undefined = undefined
  constructor(url: string){
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
      if (urlParameters.role === 'sender'){
        this.send(MessageType.CLEAR, '', '', null)
      }else{
        this.send(MessageType.REQUEST, '', '', null)
      }
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

  addParticipant(room: string, id:string){
    this.send(MessageType.ADD_PARTICIPANT, room, id, null)
  }
  removeParticipant(room: string, id:string){
    this.send(MessageType.REMOVE_PARTICIPANT, room, id, null)
  }
  updateParticipant(room: string, remote: ParticipantBase){
    this.send(MessageType.UPDATE_PARTICIPANT, room, remote.id, remote.information)
  }
  updateContents(room: string, contents: ISharedContent[], from: string){
    this.send(MessageType.UPDATE_CONTENTS, room, from, contents)
  }

  onMessage(type:string, room:string, pid: string, value:any){
    if (type === MessageType.ADD_PARTICIPANT){
      rooms.get(room).participants.join(pid)
    }else if (type === MessageType.REMOVE_PARTICIPANT){
      rooms.get(room).participants.leave(pid)
      rooms.get(room).contents.onParticipantLeft(pid)
    }else if (type === MessageType.UPDATE_PARTICIPANT){
      const info = rooms.get(room).participants.remote.get(pid)?.information
      if (info) { Object.assign(info, value) }
    }else if (type === MessageType.UPDATE_CONTENTS){
      rooms.get(room).contents.replaceRemoteContents(value, pid)
    }else if (type === MessageType.ALL_INFOS){
      const roomInfos = value as RoomInfo[]
      roomInfos.forEach(info => {
        const room = rooms.get(info.r)
        info.ps.forEach(v => {
          room.participants.join(v.p)
          Object.assign(room.participants.remote.get(v.p)?.information, JSON.parse(v.v))
        })
        info.cs.forEach(v => {
          room.contents.replaceRemoteContents(JSON.parse(v.v), v.p)
        })
      })
    }else if (type === MessageType.CLEAR){
      setTimeout(() => {
        rooms.clear()
        this.send(MessageType.REQUEST, '', '', null)
      }, Math.floor((1 + random(9)) * 1000))
    }
  }
}

export function connectRoomInfoServer(){
  if (!config.roomInfoServer){
    console.error('roomInfoServer must be specified.')
    assert(config.roomInfoServer)
  }
  const roomInfoServer = new RoomInfoServer(config.roomInfoServer)

  return roomInfoServer
}

export default connectRoomInfoServer()
