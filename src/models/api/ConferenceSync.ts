import {contentTrackCarrierName, roomInfoPeeperName} from '@models/api/Constants'
import { KickTime } from '@models/KickTime'
import {t} from '@models/locales'
import {Pose2DMap} from '@models/MapObject'
import {priorityCalculator} from '@models/middleware/trafficControl'
import {defaultRemoteInformation, Mouse, PARTICIPANT_SIZE, Physics, RemoteInformation, TrackStates} from '@models/Participant'
import {SharedContent as ISharedContent} from '@models/SharedContent'
import {urlParameters} from '@models/url'
import {normV, subV2} from '@models/utils'
import chat, { ChatMessage, ChatMessageToSend } from '@stores/Chat'
import errorInfo from '@stores/ErrorInfo'
import {MediaSettings} from '@stores/participants/LocalParticipant'
import participants from '@stores/participants/Participants'
import {extractContentDataAndIds, makeThemContents} from '@stores/sharedContents/SharedContentCreator'
import contents from '@stores/sharedContents/SharedContents'
import JitsiMeetJS from 'lib-jitsi-meet'
import _ from 'lodash'
import {autorun, IReactionDisposer} from 'mobx'
import type {BMMessage, Conference} from './Conference'
import {ConferenceEvents} from './Conference'
import { notification } from './Notification'

// config.js
declare const config:any             //  from ../../config.js included from index.html

export const MessageType = {
  //  common instant messages
  CHAT_MESSAGE: 'm_chat',                       //  -> text chat message
  PARTICIPANT_TRACKLIMITS: 'm_track_limits',    //  -> message, basically does not sync
  YARN_PHONE: 'YARN_PHONE',                     //  -> message
  CALL_REMOTE: 'call_remote',                   //  -> message, to give notification to a remote user.
  MUTE_VIDEO: 'm_mute_video',                   //  ask to mute video
  MUTE_AUDIO: 'm_mute_audio',                   //  ask to mute audio
  RELOAD_BROWSER: 'm_reload',                   //  ask to reload browser
  KICK: 'm_kick',
  //  instant but accumulating message
  CONTENT_UPDATE_REQUEST: 'content_update',     //  -> message
  CONTENT_REMOVE_REQUEST: 'content_remove',     //  -> message
  LEFT_CONTENT_REMOVE_REQUEST: 'left_content_remove',     //  -> message

  //  common messages possibly stored in the server (PropertyType is also used as type of message stored)
  PARTICIPANT_POSE: 'mp',                       //  -> update presence once per 5 sec / message immediate value
  PARTICIPANT_MOUSE: 'mm',                      //  -> message
  AFK_CHANGED: 'afk_changed',                   //

  //  For message fragmentation for SCTP
  FRAGMENT_HEAD: 'frag_head',
  FRAGMENT_CONTENT: 'frag_cont',

  //  messages only for bmRelayServer
  PARTICIPANT_LEFT: 'm_participant_left',       //  remove infos of the participant
  REQUEST: 'request',                           //  request for all info
  SET_PERIOD: 'set_period',                     //  set period to send message to me.
}

export const PropertyType = {
  PARTICIPANT_INFO: 'p_info',                   //  -> presence
  PARTICIPANT_POSE: 'p_pose',                   //  -> update presence once per 5 sec / message immediate value
  PARTICIPANT_PHYSICS: 'p_physics',             //  -> presence
  PARTICIPANT_TRACKSTATES: 'p_trackstates',     //  -> presence
  MAIN_SCREEN_CARRIER: 'main_screen_carrier',   //  -> presence
  MY_CONTENT: 'my_content',                     //  -> presence
}

//const FRAGMENTING_LENGTH = 200    //  For sctp
//const FRAGMENTING_LENGTH = 9000000  //  For websocket never flagmenting
const FRAGMENTING_LENGTH = 512 //  For websocket never flagmenting

interface FragmentedMessageHead{
  type: string
  length: number
}
interface FragmentedMessage{
  c: number
  s: string
}

const SYNC_LOG = false
const syncLog = SYNC_LOG ? console.log : () => {}

function round(n:number){ return Math.round(n*100) / 100 }
function pose2Str(pose:Pose2DMap){ return `${round(pose.position[0])},${round(pose.position[1])},${round(pose.orientation)}`}
function mouse2Str(mouse: Mouse){ return `${mouse.position[0]},${mouse.position[1]},${mouse.show?'t':''}` }

export class ConferenceSync{
  conference: Conference
  disposers: IReactionDisposer[] = []

  constructor(c:Conference) {
    this.conference = c
    //  setInterval(()=>{ this.checkRemoteAlive() }, 1000)
  }
  sendAllAboutMe(){
    this.sendPoseMessageNow()
    this.sendMouseMessageNow()
    this.sendParticipantInfoMessage()
    this.sendPhysics()
    this.sendTrackStates()
    if (contents.tracks.localMainConnection?.localId){ this.sendMainScreenCarrier(true) }
    this.sendMyContents()
    this.sendAfkChanged()
  }
  //
  sendPoseMessageNow(){
    if (this.conference.channelOpened){
      const poseStr = pose2Str(participants.local.pose)
      this.conference.sendMessage(MessageType.PARTICIPANT_POSE, '', poseStr)
    }
  }
  sendMouseMessageNow(){
    if (this.conference.channelOpened){
      const mouseStr = mouse2Str(participants.local.mouse)
      this.conference.sendMessage(MessageType.PARTICIPANT_MOUSE, '', mouseStr)
    }
  }
  sendParticipantInfoMessage(){
    this.conference.sendMessage(PropertyType.PARTICIPANT_INFO, '', {...participants.local.informationToSend})
  }
  sendPhysics(){
    if (config.bmRelayServer){
      this.conference.sendMessage(PropertyType.PARTICIPANT_PHYSICS, '', {...participants.local.physics})
    }else{
      if (this.conference.channelOpened) {
        this.conference.setLocalParticipantProperty(PropertyType.PARTICIPANT_PHYSICS, {...participants.local.physics})
      }
    }
  }
  sendTrackStates() {
    if (config.bmRelayServer){
      this.conference.sendMessage(PropertyType.PARTICIPANT_TRACKSTATES, '',
        {...participants.local.trackStates})
    }else{
      this.conference.setLocalParticipantProperty(PropertyType.PARTICIPANT_TRACKSTATES,
                                                {...participants.local.trackStates})
    }
  }
  sendAfkChanged(){
    this.conference.sendMessage(MessageType.AFK_CHANGED, '', participants.local.awayFromKeyboard)
  }

  //  Only for test (admin config dialog).
  sendTrackLimits(to:string, limits?:string[]) {
    this.conference.sendMessage(MessageType.PARTICIPANT_TRACKLIMITS, to ? to : '', limits ? limits :
                                [participants.local.remoteVideoLimit, participants.local.remoteAudioLimit])
  }
  //  Send content update request to pid
  sendContentUpdateRequest(pid: string, updated: ISharedContent[]) {
    if (!this.conference.bmRelaySocket &&
      updated.map(c=>c.url.length).reduce((prev, cur) => prev+cur) > FRAGMENTING_LENGTH) {
      this.sendFragmentedMessage(MessageType.CONTENT_UPDATE_REQUEST, pid, updated)
    }else {
      this.conference.sendMessage(MessageType.CONTENT_UPDATE_REQUEST, pid, updated)
    }
  }
  //  Send content remove request to pid
  sendContentRemoveRequest(pid: string, removed: string[]) {
    this.conference.sendMessage(MessageType.CONTENT_REMOVE_REQUEST, pid, removed)
  }
  sendLeftContentRemoveRequest(removed: string[]) {
    this.conference.sendMessage(MessageType.LEFT_CONTENT_REMOVE_REQUEST, '', removed)
  }
  //  send main screen carrir
  sendMainScreenCarrier(enabled: boolean) {
    const carrierId = contents.tracks.localMainConnection?.getParticipantId()
    if (carrierId) {
      if (config.bmRelayServer){
        this.conference.sendMessage(PropertyType.MAIN_SCREEN_CARRIER, '', {carrierId, enabled})
      }else{
        this.conference.setLocalParticipantProperty(PropertyType.MAIN_SCREEN_CARRIER, {carrierId, enabled})
      }
    }
  }
  //  send myContents of local to remote participants.
  sendMyContents() {
    const cs = Array.from(contents.localParticipant.myContents.values())
    const contentsToSend = extractContentDataAndIds(cs)
    syncLog(`send all contents ${JSON.stringify(contentsToSend.map(c => c.id))}.`,
            contentsToSend)
    if (config.bmRelayServer){
      this.conference.sendMessage(PropertyType.MY_CONTENT, '', contentsToSend)
    }else{
      this.conference.setLocalParticipantProperty(PropertyType.MY_CONTENT, contentsToSend)
    }
  }

  //  message handler
  private onParticipantTrackLimits(from:string, limits:string[]){
    participants.local.remoteVideoLimit = limits[0]
    participants.local.remoteAudioLimit = limits[1]
  }
  private onParticipantLeft(id: string){
    contents.onParticipantLeft(id)
    chat.participantLeft(id)
    participants.leave(id)
    if (this.conference.bmRelaySocket?.readyState === WebSocket.OPEN){
      this.conference.sendMessage(MessageType.PARTICIPANT_LEFT, '', id)
    }
  }
  private onChatMessage(pid: string, msg: ChatMessageToSend){
    //  console.log(`PRIVATE_MESSAGE_RECEIVED id:${id}, text:${msg.msg}, ts:${msg.ts}`)
    const from = participants.find(pid)
    if (from){
      chat.addMessage(new ChatMessage(msg.msg, from.id, from.information.name,
        from.information.avatarSrc, from.getColor(), msg.ts, msg.to ? 'private':'text'))
    }
  }
  private onCallRemote(from:string){
    const caller = participants.find(from)
    if (caller){
      chat.calledBy(caller)
      if (participants.local.information.notifyCall){
        notification(t('noCalled', {name: caller?.information.name}), {icon: './favicon.ico'})
      }
    }
  }
  private onAfkChanged(from:string, afk: boolean){
    const remote = participants.find(from)
    if (remote){ remote.awayFromKeyboard = afk }
  }
  public onKicked(pid:string, reason:string){
    errorInfo.setType('kicked', participants.remote.get(pid)?.information.name, reason)
    const str = window.localStorage.getItem('kickTimes')
    let found:KickTime|undefined = undefined
    let kickTimes:KickTime[] = []
    if (this.conference.name){
      if (str){
        kickTimes = JSON.parse(str) as KickTime[]
        found = kickTimes.find(kt => kt.room === this.conference.name)
      }
      if (!found){
        found = {room:this.conference.name, time:0}
        kickTimes.push(found)
      }
      found.time = Date.now()
      window.localStorage.setItem('kickTimes', JSON.stringify(kickTimes))
    }
    setTimeout(()=>{
      window.location.reload()
    }, 10000)
  }

  private onParticipantInfo(from:string, info:RemoteInformation){
    if (urlParameters.testBot !== null) { return }

    const remote = participants.remote.get(from)
    if (remote) {
      const name = remote.information.name
      Object.assign(remote.information, info)
      if (name !== remote.information.name){
        if (name === defaultRemoteInformation.name){
          chat.participantJoined(from)
        }else{
          chat.participantNameChanged(from, name)
        }
      }
    }
  }
  private onParticipantTrackState(from:string, states:TrackStates){
    if (urlParameters.testBot !== null) { return }

    const remote = participants.remote.get(from)
    if (remote) {
      Object.assign(remote.trackStates, states)
    }
  }
  private onParticipantPose(from:string, poseStr:string){
    const poseArray = poseStr.split(',')
    const pose = {position:[Number(poseArray[0]), Number(poseArray[1])] as [number, number],
      orientation:Number(poseArray[2])}
    const remote = participants.remote.get(from)
    const local = participants.local
    if (remote) {
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
  private onParticipantMouse(from:string, mouseStr:string){
    const mouseArray = mouseStr.split(',')
    const mouse:Mouse = {position:[Number(mouseArray[0]),Number(mouseArray[1])], show: mouseArray[2] ? true : false}
    if (urlParameters.testBot !== null) { return }
    const remote = participants.remote.get(from)
    if (remote) { Object.assign(remote.mouse, mouse) }
  }
  private onParticipantPhysics(from:string, physics:Physics){
    const remote = participants.remote.get(from)
    if (remote) {
      remote.physics.onStage = physics.onStage
    }
  }
  private onYarnPhone(from:string, drArray:string[]){
    //  console.log(`yarn from ${from} local:${participants.localId}`)
    const myself = drArray.find(id => id === participants.localId)
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
  private onMuteVideo(from: string, value: boolean){
    const setting = {} as MediaSettings
    participants.local.loadMediaSettingsFromStorage(setting)
    participants.local.muteVideo = value || setting.stream.muteVideo
  }
  private onMuteAudio(from: string, value: boolean){
    const setting = {} as MediaSettings
    participants.local.loadMediaSettingsFromStorage(setting)
    participants.local.muteAudio = value || setting.stream.muteAudio
  }
  private onReloadBrower(from: string){
    window.location.reload()
  }
  //  contents
  private onMainScreenCarrier(from: string, msg:{carrierId:string, enabled:boolean}){
    const remote = participants.remote.get(from)
    if (remote) {
      contents.tracks.onMainScreenCarrier(msg.carrierId, msg.enabled)
    }
  }
  private onMyContent(from:string, cs_:ISharedContent[]){
    const cs = makeThemContents(cs_)
    contents.checkDuplicatedWallpaper(from, cs)
    contents.replaceRemoteContents(cs, from)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const remote = participants.remote.get(from)
    syncLog(`recv remote contents ${JSON.stringify(cs.map(c => c.id))} from ${from}.`, cs)
  }
  private onContentUpdateRequest(from:string, cds:ISharedContent[]){
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const cs = makeThemContents(cds)
    contents.updateByRemoteRequest(cs)
  }
  private onContentRemoveRequest(from:string, cids:string[]){
    contents.removeByRemoteRequest(cids)
  }
  private onLeftContentRemoveRequest(from:string, cids:string[]){
    console.log(`onLeftContentRemoveRequest for ${cids} from ${from}.`)
    contents.removeLeftContentByRemoteRequest(cids)
  }

  bind() {
    //  participant related -----------------------------------------------------------------------
    //  track limit
    this.conference.on(MessageType.PARTICIPANT_TRACKLIMITS, this.onParticipantTrackLimits)

    //  left/join
    this.conference.on(ConferenceEvents.USER_LEFT, this.onParticipantLeft.bind(this))
    this.conference.on(ConferenceEvents.USER_JOINED, (id) => {
      const name = this.conference._jitsiConference?.getParticipantById(id).getDisplayName()
      if (name === contentTrackCarrierName || name === roomInfoPeeperName) {
        //  do nothing
      }else {
        participants.join(id)
      }
    })

    //  track
    this.conference.on(ConferenceEvents.REMOTE_TRACK_ADDED, (track) => {
      //  update priorty for setPerceptible message.
      priorityCalculator.onRemoteTrackAdded(track)

      //  console.log(`onRemoteTrackAdded ${track} videoType:'${track.videoType ? track.videoType : undefined}'.`)
      if (!participants.addRemoteTrack(track)) {
        contents.tracks.addRemoteTrack(track)
      }
    })
    this.conference.on(ConferenceEvents.REMOTE_TRACK_REMOVED, (track) => {
      //  console.log(`onRemoteTrackAdded ${track} videoType:'${track.videoType ? track.videoType : undefined}'.`)

      if (!participants.removeRemoteTrack(track)) {
        contents.tracks.removeRemoteTrack(track)
      }
    })

    //  chat
    this.conference.on(MessageType.CHAT_MESSAGE, this.onChatMessage)
    //  call
    this.conference.on(MessageType.CALL_REMOTE, this.onCallRemote)
    //  kick
    this.conference.on(MessageType.KICK, (pid:string, reason:string)=>{
      this.conference._jitsiConference?.room.leave()
      this.onKicked(pid, reason)
    })
    this.conference.on(MessageType.AFK_CHANGED, this.onAfkChanged)
    this.conference.on(PropertyType.PARTICIPANT_INFO, this.onParticipantInfo)
    this.conference.on(PropertyType.PARTICIPANT_TRACKSTATES, this.onParticipantTrackState)
    this.conference.on(MessageType.PARTICIPANT_POSE, this.onParticipantPose)
    this.conference.on(PropertyType.PARTICIPANT_POSE, this.onParticipantPose)
    this.conference.on(MessageType.PARTICIPANT_MOUSE, this.onParticipantMouse)
    this.conference.on(PropertyType.PARTICIPANT_PHYSICS, this.onParticipantPhysics)
    this.conference.on(MessageType.YARN_PHONE, this.onYarnPhone)
    this.conference.on(MessageType.MUTE_VIDEO, this.onMuteVideo)
    this.conference.on(MessageType.MUTE_AUDIO, this.onMuteAudio)
    this.conference.on(MessageType.RELOAD_BROWSER, this.onReloadBrower)

    // contents related ---------------------------------------------------------------
    //  main screen track's carrier id
    this.conference.on(PropertyType.MAIN_SCREEN_CARRIER, this.onMainScreenCarrier)
    //  Receive remote contents.
    this.conference.on(PropertyType.MY_CONTENT, this.onMyContent)
    //  request
    this.conference.on(MessageType.CONTENT_UPDATE_REQUEST, this.onContentUpdateRequest)
    this.conference.on(MessageType.CONTENT_REMOVE_REQUEST, this.onContentRemoveRequest)
    this.conference.on(MessageType.LEFT_CONTENT_REMOVE_REQUEST, this.onLeftContentRemoveRequest)

    //  Get data channel state
    this.conference._jitsiConference?.addEventListener(JitsiMeetJS.events.conference.DATA_CHANNEL_OPENED, () => {
      this.conference.channelOpened = true
    })

    //  fragmented message
    this.conference.on(MessageType.FRAGMENT_HEAD, (from:string, msg:FragmentedMessageHead) => {
      this.fragmentedMessageHead = msg
      this.fragmentedMessages = []
    })
    this.conference.on(MessageType.FRAGMENT_CONTENT, (from:string, msg:FragmentedMessage) => {
      this.fragmentedMessages[msg.c] = msg
      if (this.fragmentedMessageHead.length && this.fragmentedMessages.length === this.fragmentedMessageHead.length
        && (this.fragmentedMessages.findIndex(msg => msg === undefined) === -1)) {
        let str = ''
        this.fragmentedMessages.forEach(msg => str += msg.s)
        //  console.log('JSON', str)
        const obj = JSON.parse(str)
        this.conference.emit(this.fragmentedMessageHead.type, from, obj)
        this.fragmentedMessageHead = {type:'', length:0}
        this.fragmentedMessages = []
      }
    })
  }
  observeStart(){
    this.disposers.push(autorun(() => {
      participants.remote.forEach((remote)=>{
        if (remote.called){
          remote.called = false
          this.conference.sendMessage(MessageType.CALL_REMOTE, remote.id, {})
          chat.callTo(remote)
        }
      })
    }))
    this.disposers.push(autorun(() => {
      this.sendAfkChanged()
    }))
    this.disposers.push(autorun(() => {
      if (config.bmRelayServer){
        this.sendParticipantInfoMessage()
      }else{
        this.conference.setLocalParticipantProperty(PropertyType.PARTICIPANT_INFO,
          {...participants.local.informationToSend})
      }
      let name = participants.local.information.name
      while(name.slice(0,1) === '_'){ name = name.slice(1) }
      this.conference._jitsiConference?.setDisplayName(name)
    }))
    this.disposers.push(autorun(this.sendTrackStates.bind(this)))
    const calcWait = () => this.conference.bmRelaySocket?.readyState === WebSocket.OPEN
      ? Math.ceil(Math.max((participants.remote.size / 15) * 33, 33))
      : Math.ceil(Math.max((participants.remote.size / 3) * 33, 33))
    let sendPoseMessage: (poseStr:string) => void = ()=>{}
    let poseWait = 0
    let lastPoseStr=''
    this.disposers.push(autorun(() => {
      const newWait = calcWait()
      if (newWait !== poseWait) {
        poseWait = newWait
        sendPoseMessage = _.throttle((poseStr:string) => {
          if (this.conference.channelOpened){
            this.conference.sendMessage(MessageType.PARTICIPANT_POSE, '', poseStr)
          }
        },                           poseWait)  //  30fps
        //  console.log(`poseWait = ${poseWait}`)
      }

      const poseStr = pose2Str(participants.local.pose)
      if (this.conference.channelOpened && lastPoseStr !== poseStr) {
        sendPoseMessage(poseStr)
        lastPoseStr = poseStr
      }
    }))
    let updateTimeForProperty = 0

    if (!config.bmRelayServer) {
      let lastPoseStrProprty = ''
      const setPoseProperty = () => {
        const now = Date.now()
        const period = calcWait() * 30 //  (33ms(1 remote) to 1000ms(100 remotes)) * 30
        if (now - updateTimeForProperty > period) {  //  update period
          const poseStr = pose2Str(participants.local.pose)
          if (lastPoseStrProprty !== poseStr){
            this.conference.setLocalParticipantProperty(PropertyType.PARTICIPANT_POSE, poseStr)
            updateTimeForProperty = now
            lastPoseStrProprty = poseStr
          }
        }
      }
      setPoseProperty()
      setInterval(setPoseProperty, 2.5 * 1000)
    }

    let wait = 0
    let sendMouseMessage = (mouse:Mouse) => {}
    const sendMouse = (to: string) => {
      const newWait = calcWait()
      if (wait !== newWait) {
        wait = newWait
        sendMouseMessage = _.throttle((mouse: Mouse) => {
          this.conference.sendMessage(MessageType.PARTICIPANT_MOUSE, '', mouse2Str(mouse))
        },                            wait)
      }
      if (this.conference.channelOpened) {
        sendMouseMessage({...participants.local.mouse})
      }
    }
    this.disposers.push(autorun(() => { sendMouse('') }))

    this.disposers.push(autorun(() => { this.sendPhysics() }))

    const sendYarnPhones = () => {
      if (this.conference.channelOpened) {
        this.conference.sendMessage(MessageType.YARN_PHONE, '', Array.from(participants.yarnPhones))
      }
    }
    this.disposers.push(autorun(() => { sendYarnPhones() }))
  }
  observeEnd() {
    this.disposers.forEach(d => d())
  }


  //  Utilities
  private fragmentedMessages:FragmentedMessage[] = []
  private fragmentedMessageHead:FragmentedMessageHead = {type:'', length:0}
  sendFragmentedMessage(type: string, to: string, value: Object) {
    const str = JSON.stringify(value)
    const head: FragmentedMessageHead = {type, length:Math.ceil(str.length / FRAGMENTING_LENGTH)}
    this.conference.sendMessage(MessageType.FRAGMENT_HEAD, to, head)
    let count = 0
    for (let i = 0; i < str.length; i += FRAGMENTING_LENGTH) {
      this.conference.sendMessage(MessageType.FRAGMENT_CONTENT, to, {c:count, s:str.slice(i, i + FRAGMENTING_LENGTH)})
      count += 1
    }
  }
  lastMessageTime = Date.now()
  // tslint:disable-next-line: cyclomatic-complexity
  onBmMessage(msgs: BMMessage[]){
    this.lastMessageTime = Date.now()
    //  console.log(`Receive ${msgs.length} relayed messages. period:${diff}`)
    for(const msg of msgs){
      switch(msg.t){
        case MessageType.AFK_CHANGED: this.onAfkChanged(msg.p, JSON.parse(msg.v)); break
        case MessageType.CALL_REMOTE: this.onCallRemote(msg.p); break
        case MessageType.CHAT_MESSAGE: this.onChatMessage(msg.p, JSON.parse(msg.v)); break
        case MessageType.CONTENT_REMOVE_REQUEST: this.onContentRemoveRequest(msg.p, JSON.parse(msg.v)); break
        case MessageType.LEFT_CONTENT_REMOVE_REQUEST: this.onLeftContentRemoveRequest(msg.p, JSON.parse(msg.v)); break
        case MessageType.CONTENT_UPDATE_REQUEST: this.onContentUpdateRequest(msg.p, JSON.parse(msg.v)); break
        case MessageType.PARTICIPANT_MOUSE: this.onParticipantMouse(msg.p, JSON.parse(msg.v)); break
        case MessageType.PARTICIPANT_POSE: this.onParticipantPose(msg.p, JSON.parse(msg.v)); break
        case MessageType.PARTICIPANT_TRACKLIMITS: this.onParticipantTrackLimits(msg.p, JSON.parse(msg.v)); break
        case MessageType.YARN_PHONE: this.onYarnPhone(msg.p, JSON.parse(msg.v)); break
        case MessageType.RELOAD_BROWSER: this.onReloadBrower(msg.p); break
        case MessageType.MUTE_VIDEO: this.onMuteVideo(msg.p, JSON.parse(msg.v)); break
        case MessageType.MUTE_AUDIO: this.onMuteAudio(msg.p, JSON.parse(msg.v)); break
        case MessageType.KICK: this.onKicked(msg.p, JSON.parse(msg.v)); break
        case PropertyType.MAIN_SCREEN_CARRIER: this.onMainScreenCarrier(msg.p, JSON.parse(msg.v)); break
        case PropertyType.MY_CONTENT: this.onMyContent(msg.p, JSON.parse(msg.v)); break
        case PropertyType.PARTICIPANT_INFO: this.onParticipantInfo(msg.p, JSON.parse(msg.v)); break
        case PropertyType.PARTICIPANT_PHYSICS: this.onParticipantPhysics(msg.p, JSON.parse(msg.v)); break
        case PropertyType.PARTICIPANT_POSE: this.onParticipantPose(msg.p, JSON.parse(msg.v)); break
        case PropertyType.PARTICIPANT_TRACKSTATES: this.onParticipantTrackState(msg.p, JSON.parse(msg.v)); break
        default:
          console.log(`Unhandled message type ${msg.t} from ${msg.p}`)
          break
      }
    }
  }
}
