import {recorder} from '@models/recorder'
import {ISharedContent, contentsToSend, ISharedContentToSend, receiveToContents} from '@models/ISharedContent'
import {CONTENT_OUT_OF_RANGE_VALUE} from '@models/ISharedContent'
import { KickTime } from '@models/KickTime'
import {t} from '@models/locales'
import {defaultRemoteInformation, PARTICIPANT_SIZE, RemoteInformation, TrackStates, Viewpoint} from '@models/Participant'
import {urlParameters} from '@models/url'
import {mouse2Str, pose2Str, str2Mouse, str2Pose} from '@models/utils'
import {normV, subV2} from '@models/utils'
import {assert} from '@models/utils'
import chat, { ChatMessage, ChatMessageToSend } from '@stores/room/Chat'
import errorInfo from '@stores/room/ErrorInfo'
import {MediaSettings} from '@stores/participants/LocalParticipant'
import participants from '@stores/participants/Participants'
import roomInfo, {RoomPropertyName} from '@stores/room/RoomInfo'
import contentSyncService from '@stores/sharedContents/ContentSyncService'
import {autorun, IReactionDisposer} from 'mobx'
import {BMMessage} from './DataMessage'
import {DataConnection} from './DataConnection'
import {MessageType, MessageValue} from './DataMessageType'
import {notification} from './Notification'
import {connLog} from '@models/utils'
import {VrmRig} from '@models/utils/vrmIK'
import {registerMessageType, getMessageTypeEntry} from './MessageTypeRegistry'

const syncLog = connLog

export class DataSync{
  connection: DataConnection
  disposers: IReactionDisposer[] = []

  constructor(c:DataConnection) {
    this.connection = c
    //  window.setInterval(()=>{ this.checkRemoteAlive() }, 1000)
    this.registerMessageTypes()
  }
  //  Descriptor-based dispatch, migrated incrementally type-by-type -- see MessageTypeRegistry.ts.
  //  A type registered here is fully removed from the legacy switch in onBmMessage below.
  private registerMessageTypes(){
    registerMessageType(MessageType.PARTICIPANT_AFK, {
      merge: 'overwrite', recordable: true,
      onReceive: (afk, from) => this.onAfkChanged(from, afk),
    })
    registerMessageType(MessageType.PARTICIPANT_RECORDING, {
      merge: 'overwrite', recordable: false,
      onReceive: (rec, from) => this.onRecordingChanged(from, rec),
    })
    registerMessageType(MessageType.PARTICIPANT_ON_STAGE, {
      merge: 'overwrite', recordable: true,
      onReceive: (onStage, from) => this.onParticipantOnStage(from, onStage),
    })
    registerMessageType(MessageType.PARTICIPANT_TRACKSTATES, {
      merge: 'overwrite', recordable: true,
      onReceive: (states, from) => this.onParticipantTrackState(from, states),
    })
    registerMessageType(MessageType.PARTICIPANT_VIEWPOINT, {
      merge: 'overwrite', recordable: true,
      onReceive: (viewpoint, from) => this.onParticipantViewpoint(from, viewpoint),
    })
    registerMessageType(MessageType.PARTICIPANT_VRMRIG, {
      merge: 'overwrite', recordable: true,
      onReceive: (rig, from) => this.onParticipantVrmRig(from, rig),
    })
    registerMessageType(MessageType.AUDIO_LEVEL, {
      merge: 'overwrite', recordable: true,
      onReceive: (level, from) => this.onParticipantAudioLevel(from, level),
    })
    registerMessageType(MessageType.ROOM_PROP, {
      merge: 'overwrite',
      onReceive: (v) => this.onRoomProp(v[0], v[1]),
    })
    registerMessageType(MessageType.REQUEST_ALL, {
      merge: 'overwrite',
      onReceive: () => this.sendAllAboutMe(false),
    })
    registerMessageType(MessageType.REQUEST_TO, {
      merge: 'overwrite',
      onReceive: () => this.sendAllAboutMe(false),
    })
    registerMessageType(MessageType.CALL_REMOTE, {
      merge: 'overwrite',
      onReceive: (_v, from) => this.onCallRemote(from),
    })
    registerMessageType(MessageType.CHAT_MESSAGE, {
      merge: 'instant',
      onReceive: (msg, from) => this.onChatMessage(from, msg),
    })
    registerMessageType(MessageType.CONTENT_REMOVE_REQUEST, {
      merge: 'stringArray', recordable: true,
      onReceive: (cids) => this.onContentRemoveRequest(cids),
    })
    registerMessageType(MessageType.CONTENT_UPDATE_REQUEST, {
      merge: 'objectArray', recordable: true,
      onReceive: (cds) => this.onContentUpdateRequest(cds),
    })
    registerMessageType(MessageType.CONTENT_INFO_UPDATE, {
      merge: 'objectArray',
      onReceive: (cs) => this.onContentInfoUpdate(cs),
    })
    registerMessageType(MessageType.PARTICIPANT_INFO, {
      merge: 'overwrite', recordable: true,
      onReceive: (info, from) => this.onParticipantInfo(from, info),
    })
    registerMessageType(MessageType.PARTICIPANT_MOUSE, {
      merge: 'overwrite', recordable: true,
      onReceive: (mouseStr, from) => this.onParticipantMouse(from, mouseStr),
    })
    registerMessageType(MessageType.PARTICIPANT_POSE, {
      merge: 'overwrite', recordable: true,
      onReceive: (poseStr, from) => this.onParticipantPose(from, poseStr),
    })
    registerMessageType(MessageType.PARTICIPANT_TRACKLIMITS, {
      merge: 'overwrite',
      onReceive: (limits) => this.onParticipantTrackLimits(limits),
    })
    registerMessageType(MessageType.YARN_PHONE, {
      merge: 'overwrite',
      onReceive: (pids, from) => this.onYarnPhone(from, pids),
    })
    registerMessageType(MessageType.RELOAD_BROWSER, {
      merge: 'overwrite',
      onReceive: () => this.onReloadBrower(),
    })
    registerMessageType(MessageType.MUTE_VIDEO, {
      merge: 'overwrite',
      onReceive: (v) => this.onMuteVideo(v),
    })
    registerMessageType(MessageType.MUTE_AUDIO, {
      merge: 'overwrite',
      onReceive: (v) => this.onMuteAudio(v),
    })
    registerMessageType(MessageType.KICK, {
      merge: 'overwrite',
      onReceive: (reason, from) => this.onKicked(from, reason),
    })
    registerMessageType(MessageType.PARTICIPANT_OUT, {
      merge: 'stringArray',
      onReceive: (pids) => this.onParticipantOut(pids),
    })
    registerMessageType(MessageType.MOUSE_OUT, {
      merge: 'stringArray',
      onReceive: (pids) => this.onMouseOut(pids),
    })
    registerMessageType(MessageType.CONTENT_OUT, {
      merge: 'stringArray',
      onReceive: (cids) => this.onContentOut(cids),
    })
    //  PARTICIPANT_LEFT's onReceive fits the registry fine, but unlike every other type
    //  here it's a *global* removal (no single target participant) -- Player.playMessage()
    //  and Recorder's recordability check special-case it structurally the same way they
    //  special-case CONTENT_UPDATE_REQUEST/CONTENT_REMOVE_REQUEST, so only onReceive/
    //  recordable move here; there's no onPlayback to add.
    registerMessageType(MessageType.PARTICIPANT_LEFT, {
      merge: 'overwrite', recordable: true,
      onReceive: (ids) => this.onParticipantLeft(ids),
    })
  }
  sendAllAboutMe(bSendRandP: boolean){
    syncLog('sendAllAboutMe called.')
    this.sendPoseMessage(bSendRandP)
    this.sendMouseMessage()
    participants.local.sendInformation()
    this.sendOnStage()
    this.sendTrackStates()
    this.sendViewpointNow()
    this.sendAfkChanged()
    this.sendRecordingChanged()
  }
  //
  sendPoseMessage(bSendRandP: boolean){
    const poseStr = pose2Str(participants.local.pose)
    this.connection.sendMessage(MessageType.PARTICIPANT_POSE, poseStr, undefined, bSendRandP)
  }
  sendMouseMessage(){
    const mouseStr = mouse2Str(participants.local.mouse)
    this.connection.sendMessage(MessageType.PARTICIPANT_MOUSE, mouseStr)
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
  sendRecordingChanged(){
    this.connection.sendMessage(MessageType.PARTICIPANT_RECORDING, participants.local.recording)
  }

  //  Only for test (admin config dialog).
  sendTrackLimits(to:string, limits?:number[]) {
    this.connection.sendMessage(MessageType.PARTICIPANT_TRACKLIMITS, limits ? limits :
      [participants.local.remoteVideoLimit, participants.local.remoteAudioLimit],  to ? to : undefined)
  }
  //  Send vrm rig
  private sendVrmRig(){
    const rig = participants.local.vrmRig
    if (rig){
      this.connection.sendMessage(MessageType.PARTICIPANT_VRMRIG, rig)
      this.connection.flushSendMessages()
    }
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

  //  message handler
  private onRoomProp(key: RoomPropertyName, value: string|undefined){
    roomInfo.onUpdateProp(key, value)
  }
  private onParticipantTrackLimits(limits:number[]){
    participants.local.remoteVideoLimit = limits[0]
    participants.local.remoteAudioLimit = limits[1]
  }
  private onParticipantVrmRig(id:string|undefined, rig:VrmRig){
    if (id){
      const remote = participants.getRemote(id)
      if (remote) remote.vrmRig = rig
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
  private onRecordingChanged(from:string|undefined, rec: boolean){
    assert(from)
    const remote = participants.find(from)
    if (remote){ remote.recording = rec }
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
    window.setTimeout(()=>{
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
      const content = contentSyncService.find(cid)
      if (content){
        const newContent = Object.assign({}, content)
        newContent.pose = {position: [CONTENT_OUT_OF_RANGE_VALUE, CONTENT_OUT_OF_RANGE_VALUE],
          orientation: content.pose.orientation}
        contentSyncService.updateByRemoteRequest([newContent])
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
      remote.information = info
//      Object.assign(remote.information, info)
      if (name !== remote.information.name){
        if (name === defaultRemoteInformation.name){
          chat.participantJoined(from)
        }else{
          chat.participantNameChanged(from, name)
        }
      }
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
    cs.forEach(c => contentSyncService.roomContentsInfo.set(c.id, c))
  }
  private onContentUpdateRequest(cds:ISharedContentToSend[]){
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const cs = receiveToContents(cds)
    contentSyncService.updateByRemoteRequest(cs)
  }
  private onContentRemoveRequest(cids:string[]){
    contentSyncService.removeByRemoteRequest(cids)
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
    this.disposers.push(autorun(this.sendRecordingChanged.bind(this)))
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


  onBmMessage(msg: BMMessage){
    if (msg.t!==MessageType.AUDIO_LEVEL && msg.t!==MessageType.PARTICIPANT_MOUSE){
      syncLog(`Recv data msg: ${msg.t}: ${msg.v}`)
    }
    //syncLog(`Recv data msg: ${JSON.stringify(msgs)}.`)
    if (msg.v === undefined) {
      console.error(`Recv data msg ${msg.t} with value of undefined.`)
      return
    }
    recorder.recordMessage(msg)
    const registered = getMessageTypeEntry(msg.t as MessageValue)
    if (registered?.onReceive){
      registered.onReceive(JSON.parse(msg.v), msg.p)
    }else{
      syncLog(`Unhandled message type ${msg.t} from ${msg.p}`)
    }
  }
}
