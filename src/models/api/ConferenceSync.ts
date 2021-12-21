import {contentTrackCarrierName, roomInfoPeeperName} from '@models/api/Constants'
import {recorder} from '@models/api/Recorder'
import {ISharedContent} from '@models/ISharedContent'
import {CONTENT_OUT_OF_RANGE_VALUE} from '@models/ISharedContent'
import { KickTime } from '@models/KickTime'
import {t} from '@models/locales'
import {priorityCalculator} from '@models/middleware/trafficControl'
import {defaultRemoteInformation, PARTICIPANT_SIZE, RemoteInformation, TrackStates, Viewpoint} from '@models/Participant'
import {urlParameters} from '@models/url'
import {Mouse, mouse2Str, pose2Str, str2Mouse, str2Pose} from '@models/utils'
import {normV, subV2} from '@models/utils'
import {assert} from '@models/utils'
import chat, { ChatMessage, ChatMessageToSend } from '@stores/Chat'
import errorInfo from '@stores/ErrorInfo'
import {MediaSettings} from '@stores/participants/LocalParticipant'
import participants from '@stores/participants/Participants'
import roomInfo from '@stores/RoomInfo'
import {extractContentDataAndIds, makeThemContents} from '@stores/sharedContents/SharedContentCreator'
import contents from '@stores/sharedContents/SharedContents'
import JitsiMeetJS from 'lib-jitsi-meet'
import _ from 'lodash'
import {autorun, IReactionDisposer} from 'mobx'
import {BMMessage} from './BMMessage'
import {Conference} from './Conference'
import {ConferenceEvents} from './Conference'
import {MessageType} from './MessageType'
import {notification} from './Notification'

// config.js
declare const config:any             //  from ../../config.js included from index.html

export const PropertyType = {
  PARTICIPANT_INFO: 'p_info',                   //  -> presence
  PARTICIPANT_POSE: 'p_pose',                   //  -> update presence once per 5 sec / message immediate value
  PARTICIPANT_ON_STAGE: 'p_onStage',            //  -> presence
  PARTICIPANT_TRACKSTATES: 'p_trackSt',         //  -> presence
  PARTICIPANT_VIEWPOINT: 'p_viewpoint',         //  -> presence
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

export class ConferenceSync{
  conference: Conference
  disposers: IReactionDisposer[] = []

  constructor(c:Conference) {
    this.conference = c
    //  setInterval(()=>{ this.checkRemoteAlive() }, 1000)
  }
  sendAllAboutMe(bSendRandP: boolean){
    syncLog('sendAllAboutMe called.')
    this.sendPoseMessageNow(bSendRandP)
    this.sendMouseMessageNow()
    participants.local.sendInformation()
    this.sendOnStage()
    this.sendTrackStates()
    this.sendViewpointNow()
    if (contents.tracks.localMainConnection?.localId){ this.sendMainScreenCarrier(true) }
    this.sendMyContents()
    this.sendAfkChanged()
  }
  //
  sendPoseMessageNow(bSendRandP: boolean){
    const poseStr = pose2Str(participants.local.pose)
    if (config.bmRelayServer){
      this.conference.pushOrUpdateMessageViaRelay(MessageType.PARTICIPANT_POSE, poseStr, undefined, bSendRandP)
    }else{
      this.conference.sendMessageViaJitsi(MessageType.PARTICIPANT_POSE, poseStr)
    }
  }
  sendMouseMessageNow(){
    const mouseStr = mouse2Str(participants.local.mouse)
    this.conference.sendMessage(MessageType.PARTICIPANT_MOUSE, mouseStr)
  }
  sendParticipantInfo(){
    if (!participants.local.informationToSend){ return }
    if (config.bmRelayServer){
      this.conference.sendMessage(PropertyType.PARTICIPANT_INFO, {...participants.local.informationToSend})
    }else{
      this.conference.setLocalParticipantProperty(PropertyType.PARTICIPANT_INFO,
        {...participants.local.informationToSend})
    }
    let name = participants.local.information.name
    while(name.slice(0,1) === '_'){ name = name.slice(1) }
    this.conference._jitsiConference?.setDisplayName(name)
  }
  sendOnStage(){
    if (config.bmRelayServer){
      this.conference.sendMessage(PropertyType.PARTICIPANT_ON_STAGE, participants.local.physics.onStage)
    }else{
      if (this.conference.channelOpened) {
        this.conference.setLocalParticipantProperty(
          PropertyType.PARTICIPANT_ON_STAGE, participants.local.physics.onStage)
      }
    }
  }
  sendTrackStates() {
    if (config.bmRelayServer){
      this.conference.sendMessage(PropertyType.PARTICIPANT_TRACKSTATES,
        {...participants.local.trackStates})
    }else{
      this.conference.setLocalParticipantProperty(PropertyType.PARTICIPANT_TRACKSTATES,
                                                {...participants.local.trackStates})
    }
  }
  sendViewpointNow() {
    if (config.bmRelayServer){
      this.conference.sendMessage(PropertyType.PARTICIPANT_VIEWPOINT,
        {...participants.local.viewpoint})
    }else{
      this.conference.setLocalParticipantProperty(PropertyType.PARTICIPANT_VIEWPOINT,
                                                {...participants.local.viewpoint})
    }
  }
  sendAfkChanged(){
    this.conference.sendMessage(MessageType.PARTICIPANT_AFK, participants.local.physics.awayFromKeyboard)
  }

  //  Only for test (admin config dialog).
  sendTrackLimits(to:string, limits?:number[]) {
    this.conference.sendMessage(MessageType.PARTICIPANT_TRACKLIMITS, limits ? limits :
      [participants.local.remoteVideoLimit, participants.local.remoteAudioLimit],  to ? to : undefined)
  }
  //  Send content update request to pid
  sendContentUpdateRequest(pid: string, updatedContents: ISharedContent[]) {
    if (!this.conference.bmRelaySocket &&
      updatedContents.map(c=>c.url ? c.url.length : 0).reduce((prev, cur) => prev+cur) > FRAGMENTING_LENGTH) {
      this.sendFragmentedMessage(MessageType.CONTENT_UPDATE_REQUEST, updatedContents, pid)
    }else {
      this.conference.sendMessage(MessageType.CONTENT_UPDATE_REQUEST, updatedContents, pid)
    }
  }
  //  Send content remove request to pid
  sendContentRemoveRequest(pid: string, removedIds: string[]) {
    this.conference.sendMessage(MessageType.CONTENT_REMOVE_REQUEST, removedIds, pid)
  }
  sendLeftContentRemoveRequest(removedIds: string[]) {
    assert(!config.bmRelayServer)
    this.conference.sendMessage(MessageType.LEFT_CONTENT_REMOVE_REQUEST, removedIds)
  }
  //  send main screen carrir
  sendMainScreenCarrier(enabled: boolean) {
    const carrierId = contents.tracks.localMainConnection?.getParticipantId()
    if (carrierId) {
      if (config.bmRelayServer){
        this.conference.sendMessage(PropertyType.MAIN_SCREEN_CARRIER, {carrierId, enabled})
      }else{
        this.conference.setLocalParticipantProperty(PropertyType.MAIN_SCREEN_CARRIER, {carrierId, enabled})
      }
    }
  }
  //  send myContents of local to remote participants.
  sendMyContents() {
    if (config.bmRelayServer){
      this.sendContentUpdateRequest('', Array.from(contents.roomContents.values()))
    }else{
      const cs = Array.from(contents.localParticipant.myContents.values())
      const contentsToSend = extractContentDataAndIds(cs)
      syncLog(`send all contents ${JSON.stringify(contentsToSend.map(c => c.id))}.`,
              contentsToSend)
      this.conference.setLocalParticipantProperty(PropertyType.MY_CONTENT, contentsToSend)
    }
  }

  //  message handler
  private onRoomProp(key: string, value: string){
    roomInfo.onUpdateProp(key, value)
  }
  private onParticipantTrackLimits(limits:number[]){
    participants.local.remoteVideoLimit = limits[0]
    participants.local.remoteAudioLimit = limits[1]
  }
  private onParticipantLeft(id: string){
    contents.onParticipantLeft(id)
    chat.participantLeft(id)
    participants.leave(id)
    if (this.conference.bmRelaySocket?.readyState === WebSocket.OPEN){
      this.conference.sendMessage(MessageType.PARTICIPANT_LEFT, [id])
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
      remote.informationReceived = true
      syncLog(`Info of ${from} received.`)
    }
  }
  private onParticipantTrackState(from:string|undefined, states:TrackStates){
    assert(from)
    if (urlParameters.testBot !== null) { return }

    const remote = participants.remote.get(from)
    if (remote) {
      Object.assign(remote.trackStates, states)
    }
  }
  private onParticipantPose(from:string|undefined, poseStr:string){
    assert(from)
    const pose = str2Pose(poseStr)
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
  private onParticipantMouse(from:string|undefined, mouseStr:string){
    assert(from)
    const mouse = str2Mouse(mouseStr)
    if (urlParameters.testBot !== null) { return }
    const remote = participants.remote.get(from)
    if (remote) { Object.assign(remote.mouse, mouse) }
  }
  private onParticipantOnStage(from:string|undefined, onStage:boolean){
    assert(from)
    const remote = participants.remote.get(from)
    if (remote) {
      remote.physics.onStage = onStage
    }
  }
  private onParticipantViewpoint(from:string|undefined, viewpoint:Viewpoint){
    assert(from)
    if (urlParameters.testBot !== null) { return }

    const remote = participants.remote.get(from)
    if (remote) {
      Object.assign(remote.viewpoint, viewpoint)
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
  private onMainScreenCarrier(from: string|undefined, msg:{carrierId:string, enabled:boolean}){
    assert(from)
    const remote = participants.remote.get(from)
    if (remote) {
      contents.tracks.onMainScreenCarrier(msg.carrierId, msg.enabled)
    }
  }
  private onMyContent(from:string|undefined, cs_:ISharedContent[]){
    assert(from)
    const cs = makeThemContents(cs_)
    contents.checkDuplicatedWallpaper(from, cs)
    contents.replaceRemoteContents(cs, from)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const remote = participants.remote.get(from)
    syncLog(`recv remote contents ${JSON.stringify(cs.map(c => c.id))} from ${from}.`, cs)
  }
  private onContentInfoUpdate(cs:ISharedContent[]){
    assert(config.bmRelayServer)
    cs.forEach(c => contents.roomContentsInfo.set(c.id, c))
  }
  private onContentUpdateRequest(cds:ISharedContent[]){
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const cs = makeThemContents(cds)
    contents.updateByRemoteRequest(cs)
  }
  private onContentRemoveRequest(cids:string[]){
    contents.removeByRemoteRequest(cids)
  }
  private onLeftContentRemoveRequest(cids:string[]){
    console.log(`onLeftContentRemoveRequest for ${cids}.`)
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
    this.conference.on(MessageType.PARTICIPANT_AFK, this.onAfkChanged)
    this.conference.on(PropertyType.PARTICIPANT_INFO, this.onParticipantInfo)
    this.conference.on(PropertyType.PARTICIPANT_TRACKSTATES, this.onParticipantTrackState)
    this.conference.on(PropertyType.PARTICIPANT_VIEWPOINT, this.onParticipantViewpoint)
    this.conference.on(MessageType.PARTICIPANT_POSE, this.onParticipantPose)
    this.conference.on(PropertyType.PARTICIPANT_POSE, this.onParticipantPose)
    this.conference.on(MessageType.PARTICIPANT_MOUSE, this.onParticipantMouse)
    this.conference.on(PropertyType.PARTICIPANT_ON_STAGE, this.onParticipantOnStage)
    this.conference.on(PropertyType.PARTICIPANT_VIEWPOINT, this.onParticipantViewpoint)
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
          this.conference.sendMessage(MessageType.CALL_REMOTE, {}, remote.id)
          chat.callTo(remote)
        }
      })
    }))
    this.disposers.push(autorun(this.sendAfkChanged.bind(this)))
    this.disposers.push(autorun(this.sendParticipantInfo.bind(this)))
    this.disposers.push(autorun(this.sendTrackStates.bind(this)))
    if (config.bmRelayServer){
      this.disposers.push(autorun(this.sendPoseMessageNow.bind(this, false)))
      this.disposers.push(autorun(this.sendMouseMessageNow.bind(this)))
      this.disposers.push(autorun(this.sendViewpointNow.bind(this)))
    }else{
      //  pose via bridge
      const calcWait = () => Math.ceil(Math.max((participants.remote.size / 4) * 50, 50))
      let sendPoseMessage: (poseStr:string) => void = ()=>{}
      let poseWait = 0
      let lastPoseStr=''
      this.disposers.push(autorun(() => {
        const newWait = calcWait()
        if (newWait !== poseWait) {
          poseWait = newWait
          sendPoseMessage = _.throttle((poseStr:string) => {
            if (this.conference.channelOpened){
              this.conference.sendMessage(MessageType.PARTICIPANT_POSE, poseStr)
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
      //  mouse via bridge
      let wait = 0
      let sendMouseMessage = (mouse:Mouse) => {}
      const sendMouse = (to: string) => {
        const newWait = calcWait()
        if (wait !== newWait) {
          wait = newWait
          sendMouseMessage = _.throttle((mouse: Mouse) => {
            this.conference.sendMessage(MessageType.PARTICIPANT_MOUSE, mouse2Str(mouse))
          },                            wait)
        }
        if (this.conference.channelOpened) {
          sendMouseMessage({...participants.local.mouse})
        }
      }
      this.disposers.push(autorun(() => { sendMouse('') }))

      //  viewpoint via bridge
      let sendViewpointMessage = (_viewpoint:Viewpoint) => {}
      const sendViewpoint = () => {
        const newWait = calcWait()
        if (wait !== newWait) {
          wait = newWait
          sendViewpointMessage = _.throttle((viewpoint: Viewpoint) => {
            this.conference.sendMessage(MessageType.PARTICIPANT_VIEWPOINT, viewpoint)
          },                     wait)
        }
        if (this.conference.channelOpened) {
          sendViewpointMessage({...participants.local.viewpoint})
        }
      }
      this.disposers.push(autorun(() => { sendViewpoint() }))
    }

    this.disposers.push(autorun(() => { this.sendOnStage() }))

    const sendYarnPhones = () => {
      if (this.conference.channelOpened && participants.yarnPhoneUpdated) {
        participants.yarnPhoneUpdated = false
        this.conference.sendMessage(MessageType.YARN_PHONE, Array.from(participants.yarnPhones))
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
  sendFragmentedMessage(type: string, value: Object, to: string) {
    const str = JSON.stringify(value)
    const head: FragmentedMessageHead = {type, length:Math.ceil(str.length / FRAGMENTING_LENGTH)}
    this.conference.sendMessage(MessageType.FRAGMENT_HEAD, head, to)
    let count = 0
    for (let i = 0; i < str.length; i += FRAGMENTING_LENGTH) {
      this.conference.sendMessage(MessageType.FRAGMENT_CONTENT, {c:count, s:str.slice(i, i + FRAGMENTING_LENGTH)}, to)
      count += 1
    }
  }
  // tslint:disable-next-line: cyclomatic-complexity
  onBmMessage(msgs: BMMessage[]){
    syncLog(`Receive ${msgs.length} relayed messages.`)
    for(const msg of msgs){
      recorder.recordMessage(msg)
      switch(msg.t){
        case MessageType.ROOM_PROP: this.onRoomProp(...(JSON.parse(msg.v) as [string, string])); break
        case MessageType.REQUEST_TO: this.sendAllAboutMe(false); break
        case MessageType.PARTICIPANT_AFK: this.onAfkChanged(msg.p, JSON.parse(msg.v)); break
        case MessageType.CALL_REMOTE: this.onCallRemote(msg.p); break
        case MessageType.CHAT_MESSAGE: this.onChatMessage(msg.p, JSON.parse(msg.v)); break
        case MessageType.CONTENT_REMOVE_REQUEST: this.onContentRemoveRequest(JSON.parse(msg.v)); break
        case MessageType.LEFT_CONTENT_REMOVE_REQUEST: this.onLeftContentRemoveRequest(JSON.parse(msg.v)); break
        case MessageType.CONTENT_UPDATE_REQUEST: this.onContentUpdateRequest(JSON.parse(msg.v)); break
        case MessageType.CONTENT_INFO_UPDATE: this.onContentInfoUpdate(JSON.parse(msg.v)); break
        case MessageType.PARTICIPANT_MOUSE: this.onParticipantMouse(msg.p, JSON.parse(msg.v)); break
        case MessageType.PARTICIPANT_POSE: this.onParticipantPose(msg.p, JSON.parse(msg.v)); break
        case MessageType.PARTICIPANT_TRACKLIMITS: this.onParticipantTrackLimits(JSON.parse(msg.v)); break
        case MessageType.YARN_PHONE: this.onYarnPhone(msg.p, JSON.parse(msg.v)); break
        case MessageType.RELOAD_BROWSER: this.onReloadBrower(); break
        case MessageType.MUTE_VIDEO: this.onMuteVideo(JSON.parse(msg.v)); break
        case MessageType.MUTE_AUDIO: this.onMuteAudio(JSON.parse(msg.v)); break
        case MessageType.KICK: this.onKicked(msg.p, JSON.parse(msg.v)); break
        case MessageType.PARTICIPANT_OUT: this.onParticipantOut(JSON.parse(msg.v)); break
        case MessageType.MOUSE_OUT: this.onMouseOut(JSON.parse(msg.v)); break
        case MessageType.CONTENT_OUT: this.onContentOut(JSON.parse(msg.v)); break
        case PropertyType.MAIN_SCREEN_CARRIER: this.onMainScreenCarrier(msg.p, JSON.parse(msg.v)); break
        case PropertyType.MY_CONTENT: this.onMyContent(msg.p, JSON.parse(msg.v)); break
        case PropertyType.PARTICIPANT_INFO: this.onParticipantInfo(msg.p, JSON.parse(msg.v)); break
        case PropertyType.PARTICIPANT_ON_STAGE: this.onParticipantOnStage(msg.p, JSON.parse(msg.v)); break
        case PropertyType.PARTICIPANT_POSE: this.onParticipantPose(msg.p, JSON.parse(msg.v)); break
        case PropertyType.PARTICIPANT_TRACKSTATES: this.onParticipantTrackState(msg.p, JSON.parse(msg.v)); break
        case PropertyType.PARTICIPANT_VIEWPOINT: this.onParticipantViewpoint(msg.p, JSON.parse(msg.v)); break
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
      this.conference.pushOrUpdateMessageViaRelay(MessageType.REQUEST_TO, ids)
    }
  }
}
