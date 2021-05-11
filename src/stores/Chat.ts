import {t} from '@models/locales'
import participants from '@stores/participants/Participants'
import {action, makeObservable, observable} from 'mobx'
import { LocalParticipant } from './participants/LocalParticipant'
import { RemoteParticipant } from './participants/RemoteParticipant'

export type ChatMessageType = 'text' | 'log' | 'called' | 'callTo' | 'private'
export interface ChatMessageToSend{
  msg:string, //  message
  ts:number,  //  timestamp
  to:string   //  send to
}
export class ChatMessage {
  type:ChatMessageType = 'text'
  text
  pid
  name
  avatarUrl
  timestamp
  colors
  constructor(text:string, pid: string, name:string, avatarUrl:string,
    colors:string[], timestamp: number, type:ChatMessageType) {
    this.text = text
    this.pid = pid
    this.name = name
    this.avatarUrl = avatarUrl
    this.colors = colors
    this.timestamp = timestamp
    this.type = type
  }
}

export class Chat {
  @observable messages:ChatMessage[] = []
  @observable sendTo = ''

  constructor() {
    makeObservable(this)
  }
  @action limitMessages(){
    const MESSAGES_MAX = 1000
    if (chat.messages.length > MESSAGES_MAX){ chat.messages.splice(0, chat.messages.length - MESSAGES_MAX) }
  }
  @action addMessage(msg:ChatMessage){
    this.messages.push(msg)
    this.limitMessages()
  }
  participantNameChanged(pid:string, oldName: string){
    const participant = participants.find(pid)
    if (participant){
      const cm = new ChatMessage('', participant.id, participant.information.name,
        participant.information.avatarSrc, participant.getColor(), Date.now(), 'log')
      cm.text = t('cmNameChanged', {old: oldName, new: cm.name})
      this.addMessage(cm)
    }
  }
  participantJoined(pid: string){
    const participant = participants.find(pid)
    if (participant){
      const cm = new ChatMessage('', participant.id, participant.information.name,
        participant.information.avatarSrc, participant.getColor(), Date.now(), 'log')
      cm.text = t('cmJoined', {name:cm.name})
      this.addMessage(cm)
    }
  }
  participantLeft(pid: string){
    const participant = participants.find(pid)
    if (participant){
      const cm = new ChatMessage('', participant.id, participant.information.name,
        participant.information.avatarSrc, participant.getColor(), Date.now(), 'log')
      cm.text = t('cmLeft', {name:cm.name})
      this.addMessage(cm)
    }
  }
  calledBy(from: RemoteParticipant|LocalParticipant){
    const cm = new ChatMessage('', from.id, from.information.name,
    from.information.avatarSrc, from.getColor(), Date.now(), 'called')
    cm.text = t('cmCallBy', {name:cm.name})
    this.addMessage(cm)
  }
  callTo(to: RemoteParticipant|LocalParticipant){
    const cm = new ChatMessage('', to.id, to.information.name,
    to.information.avatarSrc, to.getColor(), Date.now(), 'callTo')
    cm.text = t('cmCallTo', {name:cm.name})
    this.addMessage(cm)
  }
}

const chat = new Chat()
export default chat
