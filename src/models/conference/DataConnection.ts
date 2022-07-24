import {MAP_SIZE} from '@components/Constants'
import {recorder} from '@models/conference/Recorder'
import {assert} from '@models/utils'
import map from '@stores/Map'
import {default as participants} from '@stores/participants/Participants'
import roomInfo from '@stores/RoomInfo'
import {BMMessage} from './DataMessage'
import {ClientToServerOnlyMessageType, MessageType, ObjectArrayMessageTypes, StringArrayMessageTypes} from './DataMessageType'
import {DataSync} from '@models/conference/DataSync'
import {AudioMeter} from '@models/audio/AudioMeter'


//  Log level and module log options
export const DATACONLOG = false
export const dataLog = DATACONLOG ? console.log : (a:any) => {}
export const dataDebug = DATACONLOG ? console.debug : (a:any) => {}
export let dataRequestInterval:number = 100

// config.js
declare const config:any             //  from ../../config.js included from index.html

//  Cathegolies of BMMessage's types
const stringArrayMessageTypesForClient = new Set(StringArrayMessageTypes)
stringArrayMessageTypesForClient.add(ClientToServerOnlyMessageType.CONTENT_UPDATE_REQUEST_BY_ID)
stringArrayMessageTypesForClient.add(ClientToServerOnlyMessageType.REQUEST_PARTICIPANT_STATES)


export class DataConnection {
  relaySocket:WebSocket|undefined = undefined //  Socket for message passing via separate relay server
  private peer_=''
  public get peer(){ return this.peer_ }
  private room_=''
  public get room(){ return this.room_ }
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
    return this.relaySocket?.readyState === WebSocket.OPEN
  }
  public setRoomProp(name:string, value:string){
    //  console.log(`setRoomProp(${name}, ${value})`)
    this.pushOrUpdateMessageViaRelay(MessageType.ROOM_PROP, [name, value])
    roomInfo.onUpdateProp(name, value)
  }

  public connect(room: string, peer: string){
    this.room_ = room
    this.peer_ = peer
    dataLog(`connect(${room}, ${peer})`)

    const promise = new Promise<void>((resolve, reject)=>{
      if (!config.bmRelayServer){ reject(); return }
      if (this.relaySocket){ resolve(); return }
      const onOpen = () => {
        dataLog(`dataConn socket onOpen`)
        this.messagesToSendToRelay = []
        this.sync.sendAllAboutMe(true)
        this.pushOrUpdateMessageViaRelay(MessageType.REQUEST_ALL, {})
        this.flushSendMessages()
      }
      const onMessage = (ev: MessageEvent<any>)=> {
        //  console.log(`ws:`, ev)
        if (typeof ev.data === 'string') {
          this.lastReceivedTime = Date.now()
          this.relayRttLast = this.lastReceivedTime - this.lastRequestTime

          const msgs = JSON.parse(ev.data) as BMMessage[]
          //  console.log(`Relay sock onMessage len:${msgs.length}`)
          //*
          if (msgs.length){
            this.receivedMessages.push(...msgs)
          }
          const alpha = 0.3
          if (msgs.length){
            this.relayRttAverage = alpha * this.relayRttLast + (1-alpha) * this.relayRttAverage
          }
        }
      }
      const onClose = () => {
        setTimeout(()=>{
          this.relaySocket = new WebSocket(config.bmRelayServer)
          setHandler()
        }, 5 * 1000)
      }
      const onError = () => {
        console.error(`Error in WebSocket for ${config.bmRelayServer}`)
        this.relaySocket?.close(3000, 'onError')
        onClose()
      }
      const setHandler = () => {
        this.relaySocket?.addEventListener('error', onError)
        this.relaySocket?.addEventListener('message', onMessage)
        this.relaySocket?.addEventListener('open', onOpen)
        this.relaySocket?.addEventListener('close', onClose)
      }
      this.relaySocket = new WebSocket(config.bmRelayServer)
      setHandler()
      //  start periodical communication with relay server.
      this.step()
      this.sync.observeStart()
      this.sync.sendAllAboutMe(true)
    })
    return promise
  }
  public disconnect(){
    if (config.bmRelayServer && this.peer){
      this.sync.observeEnd()
      this.pushOrUpdateMessageViaRelay(MessageType.PARTICIPANT_LEFT, [this.peer])
      this.flushSendMessages()
    }
    //  stop relayServer communication.
    this.stopStep = true
    this.room_ = ''
    this.peer_ = ''
    this.relaySocket?.close()
    this.relaySocket = undefined
  }

  private updateAudioLevel(){
    if (participants.local.trackStates.micMuted){
      participants.local.setAudioLevel(0)
    }else{
      participants.local.setAudioLevel(this.audioMeter.getAudioLevel())
    }
  }


  private stopStep = false
  private step(){
    const period = 50
    if (this.relaySocket?.readyState === WebSocket.OPEN){
      const timeToProcess = period * 0.8
      const deadline = Date.now() + timeToProcess
      while(Date.now() < deadline && this.receivedMessages.length){
        const msg = this.receivedMessages.shift()
        if (msg){
          this.sync.onBmMessage([msg])
        }
      }
      dataRequestInterval = Math.min(
        //Math.max((this.relayRttAverage-20) * participants.remote.size/40, 0) + 20, 3*1000)
        Math.max((this.relayRttAverage-20), 0) + 20, 3*1000)
        //console.log(`RTTAve:${this.relayRttAverage.toFixed(2)} Last:${this.relayRttLast}  dataRequestInterval=${dataRequestInterval}`)
        const REQUEST_WAIT_TIMEOUT = dataRequestInterval + 20 * 1000  //  wait 20 sec when failed to receive message.
      const now = Date.now()
      if (now < deadline && this.relaySocket && !this.receivedMessages.length
        && now - this.lastRequestTime > dataRequestInterval
        && (this.lastReceivedTime >= this.lastRequestTime
          || now - this.lastRequestTime > REQUEST_WAIT_TIMEOUT)){
          this.lastRequestTime = now
          const area = recorder.recording ? [-MAP_SIZE*2, MAP_SIZE*2, MAP_SIZE*2, -MAP_SIZE*2]
            : map.visibleArea()
          this.pushOrUpdateMessageViaRelay(MessageType.REQUEST_RANGE, [area, participants.audibleArea()])
          this.updateAudioLevel()
          this.flushSendMessages()
      }
      //  console.log(`step RTT:${this.relayRttAverage} remain:${deadline - Date.now()}/${timeToProcess}`)
    }
    if (!this.stopStep){
      setTimeout(()=>{this.step()}, period)
    }else{
      this.stopStep = false
    }
  }

  sendMessage(type:string, value:any, to?: string, sendRandP?: boolean) {
      this.pushOrUpdateMessageViaRelay(type, value, to, sendRandP)
  }
  receivedMessages: BMMessage[] = []

  pushOrUpdateMessageViaRelay(type:string, value:any, dest?:string, sendRandP?:boolean) {
    assert(config.bmRelayServer)
    if (!this.relaySocket || this.relaySocket.readyState !== WebSocket.OPEN){ return }
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

    if (this.relaySocket?.readyState === WebSocket.OPEN){
      this.relaySocket.send(JSON.stringify(this.messagesToSendToRelay))
      //  console.log(`Sent bmMessages: ${JSON.stringify(this.messagesToSendToRelay)}`)
      this.messagesToSendToRelay = []
    }else{
      //  console.log(`Wait to send bmMessages: ${JSON.stringify(this.messagesToSendToRelay)}`)
      this.relaySocket?.addEventListener('open', ()=> {
        const waitAndSend = ()=>{
          if(this.relaySocket?.readyState !== WebSocket.OPEN){
            setTimeout(waitAndSend, 100)
          }else{
            this.relaySocket?.send(JSON.stringify(this.messagesToSendToRelay))
            this.messagesToSendToRelay = []
          }
        }
        waitAndSend()
      })
    }
  }
}
