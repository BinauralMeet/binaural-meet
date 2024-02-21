import {MAP_SIZE} from '@components/Constants'
import {recorder} from '@models/conference/Recorder'
import map from '@stores/Map'
import {default as participants} from '@stores/participants/Participants'
import roomInfo from '@stores/RoomInfo'
import {BMMessage} from './DataMessage'
import {ClientToServerOnlyMessageType, MessageType, ObjectArrayMessageTypes, StringArrayMessageTypes} from './DataMessageType'
import {DataSync} from '@models/conference/DataSync'
import {AudioMeter} from '@models/audio/AudioMeter'
import {connLog, connDebug} from '@models/utils'
import {EventEmitter} from 'events'
import {MSMessage} from './MediaMessages'
import {messageLoads} from '@stores/MessageLoads'

//  Log level and module log options
export const dataLog = connLog
export const dataDebug = connDebug
export let dataRequestInterval:number = 100

// config.js
declare const config:any             //  from ../../config.js included from index.html

//  Cathegolies of BMMessage's types
const stringArrayMessageTypesForClient = new Set(StringArrayMessageTypes)
stringArrayMessageTypesForClient.add(ClientToServerOnlyMessageType.CONTENT_UPDATE_REQUEST_BY_ID)
stringArrayMessageTypesForClient.add(ClientToServerOnlyMessageType.REQUEST_PARTICIPANT_STATES)

type DataConnectionEvent = 'disconnect'

const dataServer = config.dataServer || config.bmRelayServer

export class DataConnection {
  dataSocket:WebSocket|undefined = undefined //  Socket for message passing via data server
  private peer_=''
  public get peer(){ return this.peer_ }
  private room_=''
  public get room(){ return this.room_ }
  private lastSentTime = Date.now()
  private lastRequestTime = Date.now()
  private lastReceivedTime = Date.now()
  private messagesToSendToRelay: BMMessage[] = []
  private relayRttLast = 50
  private relayRttAverage = 50

  private sync_ = new DataSync(this)
  public get sync() { return this.sync_ }
  private audioMeter_ = new AudioMeter()
  public get audioMeter() {return this.audioMeter_}

  public isConnected(){
    return this.dataSocket?.readyState === WebSocket.OPEN
  }
  public setRoomProp(name:string, value:string){
    //  console.log(`setRoomProp(${name}, ${value})`)
    this.sendMessage(MessageType.ROOM_PROP, [name, value])
    roomInfo.onUpdateProp(name, value)
  }

  private requestAll(sendRandP:boolean){
    this.sendMessage(MessageType.REQUEST_ALL, {}, undefined, sendRandP)
  }
  private requestRange(area:number[], range:number[]){
    this.sendMessage(MessageType.REQUEST_RANGE, [area, range])
  }

  public connect(room: string, peer: string){

    this.room_ = room
    this.peer_ = peer //This is the username


    dataLog()(`connect(${room}, ${peer})`)
    const self = this as DataConnection


    const promise = new Promise<void>((resolve, reject)=>{
      if (!dataServer){ reject(); return }
      if (this.dataSocket){
        console.warn(`dataSocket already exists.`)
      }
      function onOpen(){
        dataLog()('data connected.')
        self.messagesToSendToRelay = []
        if (config.dataServer){
          const msg:MSMessage = { type: 'dataConnect' }
          self.dataSocket?.send(JSON.stringify(msg))
        }
        self.requestAll(true)
        self.flushSendMessages()
        //  start periodical communication with data server.
        if (self.stepTimeout){
          clearTimeout(self.stepTimeout)
          self.stepTimeout = undefined
        }
        self.step()

        self.sync.observeStart()
        resolve()
      }
      function onMessage(ev: MessageEvent<any>){
        //  console.log(`ws:`, ev)
        if (typeof ev.data === 'string') {
          self.lastReceivedTime = Date.now()
          self.relayRttLast = self.lastReceivedTime - self.lastRequestTime

          const msgs = JSON.parse(ev.data) as BMMessage[]
          //  console.log(`Relay sock onMessage len:${msgs.length}`)
          //*
          if (msgs.length){
            self.receivedMessages.push(...msgs)
          }
          const alpha = 0.3
          if (msgs.length){
            self.relayRttAverage = alpha * self.relayRttLast + (1-alpha) * self.relayRttAverage
          }
          console.log(`RTT data: ${self.relayRttAverage}   ${self.relayRttLast}`)
        }
      }
      function onError(){
        console.error(`Error in WebSocket for ${dataServer}`)
        self.dataSocket?.close(3000, 'onError')
      }
      function onClose(){
        dataLog()('onClose() for dataSocket')
        self.disconnect()
      }
      function setHandler(){
        self.dataSocket?.addEventListener('error', onError)
        self.dataSocket?.addEventListener('message', onMessage)
        self.dataSocket?.addEventListener('open', onOpen)
        self.dataSocket?.addEventListener('close', onClose)
      }
      this.dataSocket = new WebSocket(dataServer)
      setHandler()
    })
    return promise
  }
  public disconnect(){
    const promise = new Promise<void>((resolve)=>{
      if (dataServer && this.peer){
        this.sync.observeEnd()
        this.sendMessage(MessageType.PARTICIPANT_LEFT, [this.peer])
        this.flushSendMessages()
      }
      //  stop relayServer communication.
      if (this.stepTimeout){
        clearTimeout(this.stepTimeout)
        this.stepTimeout = undefined
      }
      this.room_ = ''
      this.peer_ = ''
      const func = ()=>{
        if (this.dataSocket && this.dataSocket.readyState === WebSocket.OPEN && this.dataSocket.bufferedAmount){
          setTimeout(func, 100)
        }else{
          this.dataSocket?.close()
          this.dataSocket = undefined
          resolve()
        }
      }
      func()
    })
    this.emit('disconnect')
    connLog()(`dataSocket emits 'disconnect'`)
    return promise
  }
  public forceClose(){
    this.dataSocket?.close()
  }
  private updateAudioLevel(){
    if (participants.local.trackStates.micMuted){
      participants.local.setAudioLevel(0)
    }else{
      participants.local.setAudioLevel(this.audioMeter.getAudioLevel())
    }
  }


  private stepTimeout?:NodeJS.Timeout
  private step(){
    const period = 33
    if (this.dataSocket?.readyState === WebSocket.OPEN){
      const timeToProcess = period * 0.5
      let now = Date.now()
      const deadline = now + timeToProcess
      while(now < deadline && this.receivedMessages.length){
        const msg = this.receivedMessages.shift()
        if (msg){
          this.sync.onBmMessage(msg)
        }
        now = Date.now()
      }
      messageLoads.dataLoad = (now - (deadline-timeToProcess)) / timeToProcess
      dataRequestInterval = Math.min(
        //Math.max((this.relayRttAverage-20) * participants.remote.size/40, 0) + 20, 3*1000)
        Math.max((this.relayRttAverage-20), 0) + 20, 3*1000)
        //console.log(`RTTAve:${this.relayRttAverage.toFixed(2)} Last:${this.relayRttLast}  dataRequestInterval=${dataRequestInterval}`)
        const REQUEST_WAIT_TIMEOUT = dataRequestInterval + 10 * 1000  //  wait 10 sec when failed to receive message.
      if (now < deadline && this.dataSocket && !this.receivedMessages.length
        && now - this.lastRequestTime > dataRequestInterval
        && (this.lastReceivedTime >= this.lastRequestTime || now - this.lastRequestTime > REQUEST_WAIT_TIMEOUT)){
          this.lastRequestTime = now
          const area = recorder.recording ? [-MAP_SIZE*2, MAP_SIZE*2, MAP_SIZE*2, -MAP_SIZE*2]
            : map.visibleArea()
          this.requestRange(area, participants.audibleArea())
          this.updateAudioLevel()
          this.flushSendMessages()
      }else{
        if (now >= deadline){
          console.debug(`Too heavy to send REQUEST_RANGE. ${(now - deadline).toFixed(0)}ms.`)
        }
        if (now - this.lastSentTime > 3 * 1000){
          const msg:BMMessage = {
            t:MessageType.PONG,
            v:''
          }
          this.messagesToSendToRelay.push(msg)
          this.flushSendMessages()
        }
      }
      //  console.log(`step RTT:${this.relayRttAverage} remain:${deadline - Date.now()}/${timeToProcess}`)
    }
    this.stepTimeout = setTimeout(()=>{this.step()}, period)
  }

  receivedMessages: BMMessage[] = []

  sendMessage(type:string, value:any, dest?: string, sendRandP?: boolean) {
    if (!this.dataSocket || this.dataSocket.readyState !== WebSocket.OPEN){ return }
    if (!this.room || !this.peer){
      console.warn(`Relay Socket: Not connected. room:${this.room} id:${this.peer}.`)

      return
    }


    const msg:BMMessage = {t:type, v:''}
    if (sendRandP) {
      msg.r = this.room
      msg.p = this.peer
    }
    if (dest){
      msg.d = dest
    }
    const idx = this.messagesToSendToRelay.findIndex(m =>
      m.t === msg.t && m.r === msg.r && m.p === msg.p && m.d === msg.d)
    if (idx >= 0){
      if (stringArrayMessageTypesForClient.has(msg.t)){
        const oldV = JSON.parse(this.messagesToSendToRelay[idx].v) as string[]
        for(const ne of value as string[]){
          if (oldV.findIndex(e => e === ne) < 0){ oldV.push(ne) }
        }
        this.messagesToSendToRelay[idx].v = JSON.stringify(oldV)
      }else if (ObjectArrayMessageTypes.has(msg.t)){
        const oldV = JSON.parse(this.messagesToSendToRelay[idx].v) as {id:string}[]
        for(const ne of value as {id:string}[]){
          const found = oldV.findIndex(e => e.id === ne.id)
          if (found >= 0){
            oldV[found] = ne
          }else{
            oldV.push(ne)
          }
        }
        this.messagesToSendToRelay[idx].v = JSON.stringify(oldV)
      }else{  //  overwrite
        //console.log(`overwrite messageType: ${msg.t}`)
        msg.v = JSON.stringify(value)
        this.messagesToSendToRelay[idx] = msg
      }
    }else{
      msg.v = JSON.stringify(value)
      this.messagesToSendToRelay.push(msg)
      //console.log(`msg:${JSON.stringify(msg)} messages: ${JSON.stringify(this.messagesToSendToRelay)}`)
    }

    if (recorder.recording){
      msg.p = this.peer
      recorder.recordMessage(msg)
    }
  }
  public flushSendMessages() {
    if (this.messagesToSendToRelay.length === 0){ return }

    if (this.dataSocket?.readyState === WebSocket.OPEN){
      this.dataSocket.send(JSON.stringify(this.messagesToSendToRelay))
      this.lastSentTime = Date.now()
      //  console.log(`Sent bmMessages: ${JSON.stringify(this.messagesToSendToRelay)}`)
      this.messagesToSendToRelay = []
    }else{
      //  console.log(`Wait to send bmMessages: ${JSON.stringify(this.messagesToSendToRelay)}`)
      this.dataSocket?.addEventListener('open', ()=> {
        const waitAndSend = ()=>{
          if(this.dataSocket?.readyState !== WebSocket.OPEN){
            setTimeout(waitAndSend, 100)
          }else{
            this.dataSocket?.send(JSON.stringify(this.messagesToSendToRelay))
            this.lastSentTime = Date.now()
            this.messagesToSendToRelay = []
          }
        }
        waitAndSend()
      })
    }
  }

  private emitter = new EventEmitter()
  public addListener(event:DataConnectionEvent, listener:(...args:any[])=>void){
    this.emitter.addListener(event, listener)
  }
  public removeListener(event:DataConnectionEvent, listener:(...args:any[])=>void){
    this.emitter.removeListener(event, listener)
  }
  public removeAllListener(){
    this.emitter.removeAllListeners()
  }
  private emit(event:DataConnectionEvent, ...args: any[]){
    this.emitter.emit(event, args)
  }
}
