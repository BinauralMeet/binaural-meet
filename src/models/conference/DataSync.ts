import {recorder} from '@models/conference/Recorder'
import {ISharedContent, contentsToSend, ISharedContentToSend, receiveToContents} from '@models/ISharedContent'
import {CONTENT_OUT_OF_RANGE_VALUE} from '@models/ISharedContent'
import { KickTime } from '@models/KickTime'
import {t} from '@models/locales'
import {defaultRemoteInformation, PARTICIPANT_SIZE, RemoteInformation, TrackStates, Viewpoint, VRMRigs} from '@models/Participant'
import {urlParameters} from '@models/url'
import {mouse2Str, pose2Str, str2Mouse, str2Pose} from '@models/utils'
import {normV, subV2} from '@models/utils'
import {assert} from '@models/utils'
import chat, { ChatMessage, ChatMessageToSend } from '@stores/Chat'
import errorInfo from '@stores/ErrorInfo'
import {MediaSettings} from '@stores/participants/LocalParticipant'
import participants from '@stores/participants/Participants'
import roomInfo from '@stores/RoomInfo'
import contents from '@stores/sharedContents/SharedContents'
import {autorun, IReactionDisposer} from 'mobx'
import {BMMessage} from './DataMessage'
import {DataConnection} from './DataConnection'
import {MessageType} from './DataMessageType'
import {notification} from './Notification'
import {connLog} from './ConferenceLog'

const syncLog = connLog

export class DataSync{
  connection: DataConnection
  disposers: IReactionDisposer[] = []

  constructor(c:DataConnection) {
    this.connection = c
    //  setInterval(()=>{ this.checkRemoteAlive() }, 1000)
  }
  sendAllAboutMe(bSendRandP: boolean, bSendContents:boolean=true){
    syncLog('sendAllAboutMe called.')
    this.sendPoseMessage(bSendRandP)
    this.sendMouseMessage()
    participants.local.sendInformation()
    this.sendOnStage()
    this.sendTrackStates()
    this.sendViewpointNow()
    if (bSendContents) this.sendMyContents()
    this.sendAfkChanged()
  }
  //
  sendPoseMessage(bSendRandP: boolean){
    const poseStr = pose2Str(participants.local.pose)
    this.connection.sendMessage(MessageType.PARTICIPANT_POSE, poseStr, undefined, bSendRandP)
  }
  sendMouseMessage(){
    const mouseStr = mouse2Str(participants.local.mouse)
    this.connection.sendMessage(MessageType.PARTICIPANT_MOUSE, mouseStr)
    //  console.log(`Mouse: ${mouseStr} sent.`)
  }
  sendParticipantInfo(){
    if (!participants.local.informationToSend){ return }
    this.connection.sendMessage(MessageType.PARTICIPANT_INFO, {...participants.local.informationToSend})
    let name = participants.local.information.name
    while(name.slice(0,1) === '_'){ name = name.slice(1) }
  }
  sendAudioLevel(){
    this.connection.sendMessage(MessageType.AUDIO_LEVEL, participants.local.audioLevel)
  }
  sendOnStage(){
    this.connection.sendMessage(MessageType.PARTICIPANT_ON_STAGE, participants.local.physics.onStage)
  }
  sendTrackStates() {
    this.connection.sendMessage(MessageType.PARTICIPANT_TRACKSTATES,
      {...participants.local.trackStates})
  }
  sendViewpointNow() {
    this.connection.sendMessage(MessageType.PARTICIPANT_VIEWPOINT,
        {...participants.local.viewpoint})
  }
  sendAfkChanged(){
    this.connection.sendMessage(MessageType.PARTICIPANT_AFK, participants.local.physics.awayFromKeyboard)
  }

  //  Only for test (admin config dialog).
  sendTrackLimits(to:string, limits?:number[]) {
    this.connection.sendMessage(MessageType.PARTICIPANT_TRACKLIMITS, limits ? limits :
      [participants.local.remoteVideoLimit, participants.local.remoteAudioLimit],  to ? to : undefined)
  }
  //  Send vrm rig
  private sendVrmRig(){
    this.connection.sendMessage(MessageType.PARTICIPANT_VRMRIG, participants.local.vrmRigs)
    this.connection.flushSendMessages()
  }
  //  Send content update request to pid
  sendContentUpdateRequest(pid: string, updatedContents: ISharedContent[]) {
    const contentsDataToSend = contentsToSend(updatedContents)
    this.connection.sendMessage(MessageType.CONTENT_UPDATE_REQUEST, contentsDataToSend, pid)
  }
  //  Send content remove request to pid
  sendContentRemoveRequest(pid: string, removedIds: string[]) {
    this.connection.sendMessage(MessageType.CONTENT_REMOVE_REQUEST, removedIds, pid)
  }
  //  send myContents of local to remote participants.
  sendMyContents() {
      this.sendContentUpdateRequest('', Array.from(contents.roomContents.values()))
  }

  //  message handler
  private onRoomProp(key: string, value: string){
    roomInfo.onUpdateProp(key, value)
  }
  private onRequestAllProcessed(){
    this.sendAllAboutMe(true)
  }
  private onParticipantTrackLimits(limits:number[]){
    participants.local.remoteVideoLimit = limits[0]
    participants.local.remoteAudioLimit = limits[1]
  }
  private onParticipantVrmRig(id:string|undefined, rig:VRMRigs){
    if (id){
      const remote = participants.getRemote(id)
      if (remote) remote.vrmRigs = rig
    }
  }
  private onParticipantLeft(ids: string[]){
    for(const id of ids){
      chat.participantLeft(id)
      participants.leave(id)
    }
  }
  private onChatMessage(pid: string|undefined, msg: ChatMessageToSend){
    assert(pid)
    //  console.log(`PRIVATE_MESSAGE_RECEIVED id:${id}, text:${msg.msg}, ts:${msg.ts}`)
    const from = participants.find(pid)
    if (from){
      chat.addMessage(new ChatMessage(msg.msg, from.id, from.information.name,
        from.information.avatarSrc, from.getColor(), msg.ts, msg.to ? 'private':'text'))
    }
  }
  private onCallRemote(from:string|undefined){
    assert(from)
    const caller = participants.find(from)
    if (caller){
      chat.calledBy(caller)
      if (participants.local.information.notifyCall){
        notification(t('noCalled', {name: caller?.information.name}), {icon: './favicon.ico'})
      }
    }
  }
  private onAfkChanged(from:string|undefined, afk: boolean){
    assert(from)
    const remote = participants.find(from)
    if (remote){ remote.physics.awayFromKeyboard = afk }
  }
  public onKicked(pid:string|undefined, reason:string){
    assert(pid)
    errorInfo.setType('kicked', participants.remote.get(pid)?.information.name, reason)
    const str = window.localStorage.getItem('kickTimes')
    let found:KickTime|undefined = undefined
    let kickTimes:KickTime[] = []
    if (this.connection.room){
      if (str){
        kickTimes = JSON.parse(str) as KickTime[]
        found = kickTimes.find(kt => kt.room === this.connection.room)
      }
      if (!found){
        found = {room:this.connection.room, time:0}
        kickTimes.push(found)
      }
      found.time = Date.now()
      window.localStorage.setItem('kickTimes', JSON.stringify(kickTimes))
    }
    setTimeout(()=>{
      window.location.reload()
    }, 10000)
  }
  private onParticipantOut(pids: string[]){
    pids.forEach(pid => {
      const participant = participants.find(pid)
      if (participant){
        participant.physics.located = false
      }
    })
  }
  private onMouseOut(pids: string[]){
    pids.forEach(pid => {
      const participant = participants.find(pid)
      if (participant){
        participant.mouse.position = [CONTENT_OUT_OF_RANGE_VALUE, CONTENT_OUT_OF_RANGE_VALUE]
      }
    })
  }
  private onContentOut(cids: string[]){
    cids.forEach(cid => {
      const content = contents.find(cid)
      if (content){
        const newContent = Object.assign({}, content)
        newContent.pose = {position: [CONTENT_OUT_OF_RANGE_VALUE, CONTENT_OUT_OF_RANGE_VALUE],
          orientation: content.pose.orientation}
        contents.updateByRemoteRequest([newContent])
        //  console.log(`content out ${cid}`)
      }
    })
  }

  private onParticipantInfo(from:string|undefined, info:RemoteInformation){
    assert(from)
    if (urlParameters.testBot !== null) { return }
    if (from !== participants.localId){
      const remote = participants.getOrCreateRemote(from)
      if (!remote) return
      const name = remote.information.name
      Object.assign(remote.information, info)
      if (name !== remote.information.name){
        if (name === defaultRemoteInformation.name){
          chat.participantJoined(from)
        }else{
          chat.participantNameChanged(from, name)
        }
      }
      remote.informationReceived = true
      syncLog(`Info of ${from} received.`)
    }
  }
  private onParticipantTrackState(from:string|undefined, states:TrackStates){
    assert(from)
    if (urlParameters.testBot !== null) { return }

    if (from !== participants.localId){
      const remote = participants.getRemote(from)
      if (!remote) return
      Object.assign(remote.trackStates, states)
    }
  }
  private onParticipantPose(from:string|undefined, poseStr:string){
    assert(from)
    if (from !== participants.localId){
      const remote = participants.getRemote(from)
      if (!remote) return
      const pose = str2Pose(poseStr)
      const local = participants.local
      remote.pose.orientation = pose.orientation
      remote.pose.position = pose.position
      remote.physics.located = true
      if (local.information.notifyNear || local.information.notifyTouch){
        const distance = normV(subV2(remote.pose.position, local.pose.position))
        const NEAR = PARTICIPANT_SIZE * 3
        const TOUCH = PARTICIPANT_SIZE
        if (remote.lastDistance > TOUCH &&  distance <= TOUCH
          && local.information.notifyTouch){
          notification(t('noTouched',{name: remote.information.name}), {icon: './favicon.ico'})
        }else if (remote.lastDistance > NEAR && distance < NEAR && local.information.notifyNear){
          notification(t('noNear', {name: remote.information.name}), {icon: './favicon.ico'})
        }
        remote.lastDistance = distance
      }
    }
  }
  private onParticipantAudioLevel(from:string|undefined, l:number){
    if (from && from !== participants.localId){
      const remote = participants.getRemote(from)
      if (remote) remote.audioLevel = l
    }
  }
  private onParticipantMouse(from:string|undefined, mouseStr:string){
    assert(from)
    const mouse = str2Mouse(mouseStr)
    if (urlParameters.testBot !== null) { return }
    if (from !== participants.localId){
      const remote = participants.getRemote(from)
      if (remote) Object.assign(remote.mouse, mouse)
    }
  }
  private onParticipantOnStage(from:string|undefined, onStage:boolean){
    assert(from)
    if (from !== participants.localId){
      const remote = participants.getRemote(from)
      if (remote) remote.physics.onStage = onStage
    }
  }
  private onParticipantViewpoint(from:string|undefined, viewpoint:Viewpoint){
    assert(from)
    if (urlParameters.testBot !== null) { return }

    if (from !== participants.localId){
      const remote = participants.getRemote(from)
      if (remote) Object.assign(remote.viewpoint, viewpoint)
    }
  }
  private onYarnPhone(from:string|undefined, connectedPids:string[]){
    assert(from)
    //  console.log(`yarn from ${from} local:${participants.localId}`)
    const myself = connectedPids.find(id => id === participants.localId)
    if (myself) {
      if (!participants.yarnPhones.has(from)){
        participants.yarnPhones.add(from)
        if (participants.local.information.notifyYarn){
          const remote = participants.find(from)
          if (remote){
            notification(t('noYarn', {name: remote.information.name}), {icon: './favicon.ico'})
          }
        }
      }
    }else {
      participants.yarnPhones.delete(from)
    }
  }
  private onMuteVideo(value: boolean){
    const setting = {} as MediaSettings
    participants.local.loadMediaSettingsFromStorage(setting)
    participants.local.muteVideo = value || setting.stream.muteVideo
  }
  private onMuteAudio(value: boolean){
    const setting = {} as MediaSettings
    participants.local.loadMediaSettingsFromStorage(setting)
    participants.local.muteAudio = value || setting.stream.muteAudio
  }
  private onReloadBrower(){
    window.location.reload()
  }
  //  contents
  private onContentInfoUpdate(cs:ISharedContent[]){
    cs.forEach(c => contents.roomContentsInfo.set(c.id, c))
  }
  private onContentUpdateRequest(cds:ISharedContentToSend[]){
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const cs = receiveToContents(cds)
    contents.updateByRemoteRequest(cs)
  }
  private onContentRemoveRequest(cids:string[]){
    contents.removeByRemoteRequest(cids)
  }

  observeStart(){
    this.disposers.push(autorun(() => {
      participants.remote.forEach((remote)=>{
        if (remote.called){
          remote.called = false
          this.connection.sendMessage(MessageType.CALL_REMOTE, {}, remote.id)
          chat.callTo(remote)
        }
      })
    }))
    this.disposers.push(autorun(this.sendAfkChanged.bind(this)))
    this.disposers.push(autorun(this.sendParticipantInfo.bind(this)))
    this.disposers.push(autorun(this.sendAudioLevel.bind(this)))
    this.disposers.push(autorun(this.sendTrackStates.bind(this)))
    this.disposers.push(autorun(this.sendPoseMessage.bind(this, false)))
    this.disposers.push(autorun(this.sendMouseMessage.bind(this)))
    this.disposers.push(autorun(this.sendViewpointNow.bind(this)))
    this.disposers.push(autorun(this.sendOnStage.bind(this)))
    this.disposers.push(autorun(this.sendVrmRig.bind(this)))

    const sendYarnPhones = () => {
      if (participants.yarnPhoneUpdated) {
        participants.yarnPhoneUpdated = false
        this.connection.sendMessage(MessageType.YARN_PHONE, Array.from(participants.yarnPhones))
      }
    }
    this.disposers.push(autorun(() => { sendYarnPhones() }))
  }
  observeEnd() {
    this.disposers.forEach(d => d())
  }


  // tslint:disable-next-line: cyclomatic-complexity
  onBmMessage(msgs: BMMessage[]){
    syncLog(`Recv data msg: ${msgs.map(m => m.t).reduce((p, c)=>`${p} ${c}`,'')}.`)
    //syncLog(`Recv data msg: ${JSON.stringify(msgs)}.`)
    for(const msg of msgs){
      if (msg.v === undefined) continue
      recorder.recordMessage(msg)
      switch(msg.t){
        case MessageType.ROOM_PROP: this.onRoomProp(...(JSON.parse(msg.v) as [string, string])); break
        case MessageType.REQUEST_ALL: this.onRequestAllProcessed(); break
        case MessageType.REQUEST_TO: this.sendAllAboutMe(false); break
        case MessageType.PARTICIPANT_AFK: this.onAfkChanged(msg.p, JSON.parse(msg.v)); break
        case MessageType.PARTICIPANT_LEFT: this.onParticipantLeft(JSON.parse(msg.v)); break
        case MessageType.CALL_REMOTE: this.onCallRemote(msg.p); break
        case MessageType.CHAT_MESSAGE: this.onChatMessage(msg.p, JSON.parse(msg.v)); break
        case MessageType.CONTENT_REMOVE_REQUEST: this.onContentRemoveRequest(JSON.parse(msg.v)); break
        case MessageType.CONTENT_UPDATE_REQUEST: this.onContentUpdateRequest(JSON.parse(msg.v)); break
        case MessageType.CONTENT_INFO_UPDATE: this.onContentInfoUpdate(JSON.parse(msg.v)); break
        case MessageType.PARTICIPANT_INFO: this.onParticipantInfo(msg.p, JSON.parse(msg.v)); break
        case MessageType.PARTICIPANT_MOUSE: this.onParticipantMouse(msg.p, JSON.parse(msg.v)); break
        case MessageType.PARTICIPANT_POSE: this.onParticipantPose(msg.p, JSON.parse(msg.v)); break
        case MessageType.PARTICIPANT_ON_STAGE: this.onParticipantOnStage(msg.p, JSON.parse(msg.v)); break
        case MessageType.PARTICIPANT_TRACKSTATES: this.onParticipantTrackState(msg.p, JSON.parse(msg.v)); break
        case MessageType.PARTICIPANT_VIEWPOINT: this.onParticipantViewpoint(msg.p, JSON.parse(msg.v)); break
        case MessageType.AUDIO_LEVEL: this.onParticipantAudioLevel(msg.p, JSON.parse(msg.v)); break
        case MessageType.PARTICIPANT_TRACKLIMITS: this.onParticipantTrackLimits(JSON.parse(msg.v)); break
        case MessageType.PARTICIPANT_VRMRIG: this.onParticipantVrmRig(msg.p, JSON.parse(msg.v)); break
        case MessageType.YARN_PHONE: this.onYarnPhone(msg.p, JSON.parse(msg.v)); break
        case MessageType.RELOAD_BROWSER: this.onReloadBrower(); break
        case MessageType.MUTE_VIDEO: this.onMuteVideo(JSON.parse(msg.v)); break
        case MessageType.MUTE_AUDIO: this.onMuteAudio(JSON.parse(msg.v)); break
        case MessageType.KICK: this.onKicked(msg.p, JSON.parse(msg.v)); break
        case MessageType.PARTICIPANT_OUT: this.onParticipantOut(JSON.parse(msg.v)); break
        case MessageType.MOUSE_OUT: this.onMouseOut(JSON.parse(msg.v)); break
        case MessageType.CONTENT_OUT: this.onContentOut(JSON.parse(msg.v)); break
        default:
          console.log(`Unhandled message type ${msg.t} from ${msg.p}`)
          break
      }
    }
    this.checkInfo()
  }
  checkInfo(){
    const remotes = Array.from(participants.remote.values())
    const ids = remotes.filter(remote => !remote.informationReceived).map(remote => remote.id)
    if (ids.length){
      syncLog(`checkInfo sent ${ids}`)
      this.connection.sendMessage(MessageType.REQUEST_TO, ids)
    }
  }
}
