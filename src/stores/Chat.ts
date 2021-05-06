import {t} from '@models/locales'
import participants from '@stores/participants/Participants'
import {action, makeObservable, observable} from 'mobx'

export type ChatMessageType = 'text' | 'log'
export class ChatMessage {
  @observable type = 'text'
  @observable text
  @observable name
  @observable avatarUrl
  @observable timestamp
  @observable colors
  constructor(text:string, name:string, avatarUrl:string, colors:string[], timestamp: number, type:ChatMessageType) {
    makeObservable(this)
    this.text = text
    this.name = name
    this.avatarUrl = avatarUrl
    this.colors = colors
    this.timestamp = timestamp
    this.type = type
  }
}

export class Chat {
  @observable messages:ChatMessage[] = []

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
      const cm = new ChatMessage('', participant.information.name,
        participant.information.avatarSrc, participant.getColor(), Date.now(), 'log')
      cm.text = t('cmNameChanged', {old: oldName, new: cm.name})
      this.addMessage(cm)
    }
  }
  participantJoined(pid: string){
    const participant = participants.find(pid)
    if (participant){
      const cm = new ChatMessage('', participant.information.name,
        participant.information.avatarSrc, participant.getColor(), Date.now(), 'log')
      cm.text = cm.name + t('cmJoined')
      this.addMessage(cm)
    }
  }
  participantLeft(pid: string){
    const participant = participants.find(pid)
    if (participant){
      const cm = new ChatMessage('', participant.information.name,
        participant.information.avatarSrc, participant.getColor(), Date.now(), 'log')
      cm.text = cm.name + t('cmLeft')
      this.addMessage(cm)
    }
  }
}

const chat = new Chat()
export default chat
