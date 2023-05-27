import {default as participants} from '@stores/participants/Participants'
import {connLog} from './ConferenceLog'
import {MSMessage, MSPositionConnectMessage, MSPositionMessage } from './MediaMessages'
import { autorun } from 'mobx'
import settings from '@stores/Settings'
import {conference} from '@models/conference'

//  Log level and module log options
export const DATACONLOG = false
export const positionLog = connLog


export class PositionConnection {
  positionSocket:WebSocket|undefined = undefined //  Socket to connect LPS
  private peer_=''
  public get peer(){ return this.peer_ }
  private room_=''
  public get room(){ return this.room_ }
  private name_=''
  public get name(){ return this.name_ }
  private id_=''
  public get id(){ return this.id_ }

  constructor(){
    autorun(()=>{
      if (!this.isDisconnected()){
        this.disconnect().then(()=>{ this.connect() })
      }else{
        this.connect()
      }
    })

  }

  public isConnected(){
    return this.positionSocket?.readyState === WebSocket.OPEN
  }
  public isDisconnected(){
    return !this.positionSocket || this.positionSocket.readyState === WebSocket.CLOSED
  }
  public connect(){
    if (settings.lpsUrl && settings.lpsId && conference && participants){
      this.connectToWS(settings.lpsUrl, settings.lpsId, conference.room, conference.rtcTransports.peer, participants.local.information.name)
    }
  }
  public connectToWS(url: string, id:string, room: string, peer: string, name:string){
    this.id_ = id
    this.room_ = room
    this.peer_ = peer
    this.name_ = name
    positionLog(`connect to position server(${room}, ${peer}, ${name})`)

    const promise = new Promise<void>((resolve, reject)=>{
      if (!url){ reject(); return }
      if (this.positionSocket){
        console.warn(`positionSocket already exists.`)
      }
      const onOpen = () => {
        positionLog('position connected.')
        const msg:MSPositionConnectMessage = {
          type: 'positionConnect',
          id: this.id,
          name: this.name,
          room: this.room,
          peer: this.peer
        }
        const sendText = JSON.stringify(msg)
        console.debug(`sendText=${sendText}`)
        this.positionSocket?.send(sendText)
        resolve()
      }
      const onMessage = (ev: MessageEvent<any>)=> {
        console.debug(`position socket:`, ev)
        if (typeof ev.data === 'string') {
          const base = JSON.parse(ev.data) as MSMessage
          //console.log(`position sock onMessage`, JSON.stringify(base))
          if (base.type === 'position'){
            const msg = base as MSPositionMessage
            participants.local.pose = {position: msg.position as [number, number], orientation: msg.orientation}
            if (participants.local.information.avatar !== 'circle'){
              participants.local.information.avatar = 'circle'
              participants.local.sendInformation()
            }
          }
        }
      }
      const onError = () => {
        console.warn(`Error in position socket: ${url}`)
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
        this.positionSocket = new WebSocket(url)
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
