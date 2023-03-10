import {default as participants} from '@stores/participants/Participants'
import {connLog, connDebug} from './ConferenceLog'
import {MSMessage, MSPositionConnectMessage, MSPositionMessage } from './MediaMessages'

//  Log level and module log options
export const DATACONLOG = false
export const positionLog = connLog

// config.js
declare const config:any             //  from ../../config.js included from index.html


export class PositionConnection {
  positionSocket:WebSocket|undefined = undefined //  Socket for message passing via separate relay server
  private peer_=''
  public get peer(){ return this.peer_ }
  private room_=''
  public get room(){ return this.room_ }
  private name_=''
  public get name(){ return this.name_ }

  public isConnected(){
    return this.positionSocket?.readyState === WebSocket.OPEN
  }
  public connect(room: string, peer: string, name:string){
    this.room_ = room
    this.peer_ = peer
    this.name_ = name
    positionLog(`connect to position server(${room}, ${peer}, ${name})`)

    const promise = new Promise<void>((resolve, reject)=>{
      const server = config.positionServer
      if (!server){ reject(); return }
      if (this.positionSocket){
        console.warn(`positionSocket already exists.`)
      }
      const onOpen = () => {
        positionLog('position connected.')
        const msg:MSPositionConnectMessage = {
          type: 'positionConnect',
          name: this.name,
          room: this.room,
          peer: this.peer
        }
        const sendText = JSON.stringify(msg)
        console.log(`sendText=${sendText}`)
        this.positionSocket?.send(sendText)
        resolve()
      }
      const onMessage = (ev: MessageEvent<any>)=> {
        console.log(`position socket:`, ev)
        if (typeof ev.data === 'string') {
          const base = JSON.parse(ev.data) as MSMessage
          //console.log(`position sock onMessage`, JSON.stringify(base))
          if (base.type === 'position'){
            const msg = base as MSPositionMessage
            participants.local.pose = {position: msg.position as [number, number], orientation: msg.orientation}
          }
        }
      }
      const onError = () => {
        console.warn(`Error in position socket: ${server}`)
        this.positionSocket?.close(3000, 'onError')
      }
      const onClose = () => {
        positionLog('onClose() for position socket')
        this.disconnect()
      }
      const setHandler = () => {
        this.positionSocket?.addEventListener('error', onError)
        this.positionSocket?.addEventListener('message', onMessage)
        this.positionSocket?.addEventListener('open', onOpen)
        this.positionSocket?.addEventListener('close', onClose)
      }
      try{
        this.positionSocket = new WebSocket(server)
      }catch(e){
        console.warn('Failed to connect to position sensor server', e)
      }
      setHandler()
    })
    return promise
  }
  public disconnect(){
    const promise = new Promise<void>((resolve)=>{
      this.room_ = ''
      this.peer_ = ''
      this.name_ = ''
      const func = ()=>{
        if (this.positionSocket && this.positionSocket.readyState === WebSocket.OPEN && this.positionSocket.bufferedAmount){
          setTimeout(func, 100)
        }else{
          this.positionSocket?.close()
          this.positionSocket = undefined
          resolve()
        }
      }
      func()
    })
    return promise
  }
  public forceClose(){
    this.positionSocket?.close()
  }
}
