import {contentTrackCarrierName, roomInfoPeeperName} from '@models/api/Constants'
import {RemoteInformation} from '@models/Participant'
import {SharedContent as ISharedContent} from '@models/SharedContent'
import {makeThemContents} from '@stores/sharedContents/SharedContentCreator'
import JitsiMeetJS from 'lib-jitsi-meet'
import {IReactionDisposer} from 'mobx'
import type {BMMessage, Conference} from './Conference'
import {ConferenceEvents} from './Conference'
import roomInfoServer from './roomInfoServer'

// config.js
declare const config:any             //  from ../../config.js included from index.html

export const MessageType = {
  //  common instant messages
  CHAT_MESSAGE: 'm_chat',                       //  -> text chat message
  PARTICIPANT_TRACKLIMITS: 'm_track_limits',    //  -> message, basically does not sync
  YARN_PHONE: 'YARN_PHONE',                     //  -> message
  CALL_REMOTE: 'call_remote',                   //  -> message, to give notification to a remote user.
  CONTENT_UPDATE_REQUEST: 'content_update',     //  -> message
  CONTENT_REMOVE_REQUEST: 'content_remove',     //  -> message
  MUTE_VIDEO: 'm_mute_video',                   //  ask to mute video
  MUTE_AUDIO: 'm_mute_audio',                   //  ask to mute audio
  RELOAD_BROWSER: 'm_reload',                   //  ask to reload browser
  KICK: 'm_kick',

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

export class ConferenceSync{
  conference: Conference
  disposers: IReactionDisposer[] = []

  constructor(c:Conference) {
    this.conference = c
    //  setInterval(()=>{ this.checkRemoteAlive() }, 1000)
  }

  //  Send content update request to pid
  sendContentUpdateRequest(pid: string, updated: ISharedContent) {
    if (updated.url.length > FRAGMENTING_LENGTH) {
      this.sendFragmentedMessage(MessageType.CONTENT_UPDATE_REQUEST, pid, updated)
    }else {
      this.conference.sendMessage(MessageType.CONTENT_UPDATE_REQUEST, pid, updated)
    }
  }

  bind() {
    //  participant related -----------------------------------------------------------------------
    //  left/join
    this.conference.on(ConferenceEvents.USER_LEFT, this.onParticipantLeft)
    this.conference.on(ConferenceEvents.USER_JOINED, (id) => {
      const name = this.conference._jitsiConference?.getParticipantById(id).getDisplayName()
      if (name === contentTrackCarrierName || name === roomInfoPeeperName) {
        //  do nothing
      }else {
        this.conference.room!.participants.join(id)
        roomInfoServer.addParticipant(this.conference.room!.name, id)
      }
    })

    //  info
    this.conference.on(PropertyType.PARTICIPANT_INFO, (from:string, info:RemoteInformation) => {
      const remote = this.conference.room!.participants.remote.get(from)
      if (remote) {
        Object.assign(remote.information, info)
        roomInfoServer?.updateParticipant(this.conference.room!.name, remote)
      }
    })

    //  mute video
    this.conference.on(MessageType.MUTE_VIDEO, this.onMuteVideo)
    //  mute audio
    this.conference.on(MessageType.MUTE_AUDIO, this.onMuteAudio)
    //  reload browser
    this.conference.on(MessageType.RELOAD_BROWSER, this.onReloadBrower)

    // contents related ---------------------------------------------------------------
    //  my contents
    //  Send my content to remote to refresh.
    this.conference.on(PropertyType.MY_CONTENT, (from:string, cs_:ISharedContent[]) => {
      const cs = makeThemContents(cs_)
      this.conference.room!.contents.replaceRemoteContents(cs, from)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const remote = this.conference.room!.participants.remote.get(from)
      syncLog(`recv remote contents ${JSON.stringify(cs.map(c => c.id))} from ${from}.`, cs)
      roomInfoServer?.updateContents(this.conference.room!.name, cs, from)
    })

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
  unbind() {
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
  private onParticipantLeft(id: string){
    this.conference.room!.contents.onParticipantLeft(id)
    this.conference.room!.participants.leave(id)
    roomInfoServer?.removeParticipant(this.conference.room!.name, id)
  lastMessageTime = Date.now()
  onBmMessage(msgs: BMMessage[]){
    const diff = Date.now() - this.lastMessageTime
    this.lastMessageTime = Date.now()
    console.log(`Receive ${msgs.length} relayed messages. period:${diff}`)
    for(const msg of msgs){
      switch(msg.t){
        case MessageType.AFK_CHANGED: this.onAfkChanged(msg.p, JSON.parse(msg.v)); break
        case MessageType.CALL_REMOTE: this.onCallRemote(msg.p); break
        case MessageType.CHAT_MESSAGE: this.onChatMessage(msg.p, JSON.parse(msg.v)); break
        case MessageType.CONTENT_REMOVE_REQUEST: this.onContentRemoveRequest(msg.p, JSON.parse(msg.v)); break
        case MessageType.CONTENT_UPDATE_REQUEST: this.onContentUpdateRequest(msg.p, JSON.parse(msg.v)); break
        case MessageType.PARTICIPANT_MOUSE: this.onParticipantMouse(msg.p, JSON.parse(msg.v)); break
        case MessageType.PARTICIPANT_POSE: this.onParticipantPose(msg.p, JSON.parse(msg.v)); break
        case MessageType.PARTICIPANT_TRACKLIMITS: this.onParticipantTrackLimits(msg.p, JSON.parse(msg.v)); break
        case MessageType.YARN_PHONE: this.onYarnPhone(msg.p, JSON.parse(msg.v)); break
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
