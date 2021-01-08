import {Pose2DMap} from '@models/MapObject'
import {Mouse} from '@models/Participant'
import {SharedContent as ISharedContent} from '@models/SharedContent'
import {diffMap, diffSet, intersectionMap} from '@models/utils'
import participants from '@stores/participants/Participants'
import {makeItContent, makeThemContents} from '@stores/sharedContents/SharedContentCreator'
import contents from '@stores/sharedContents/SharedContents'
const contentLog = console.log
import {priorityCalculator} from '@models/middleware/trafficControl'
import JitsiMeetJS from 'lib-jitsi-meet'
import _ from 'lodash'
import {autorun, IReactionDisposer} from 'mobx'
import {Conference, ConferenceEvents} from './Conference'
import {contentTrackCarrierName} from './ConnectionForScreenContent'

export const MessageType = {
  REQUEST_INFO: 'req_info',
  PARTICIPANT_POSE: 'participant_pose',
  PARTICIPANT_MOUSE: 'participant_mouse',
  PARTICIPANT_PHYSICS: 'participant_physics',
  MAIN_SCREEN_CARRIER: 'main_screen_carrier',
  CONTENT_UPDATE_MINE: 'content_update_mine',
  CONTENT_REMOVE_MINE: 'content_remove_mine',
  CONTENT_UPDATE_REQUEST: 'content_update',
  CONTENT_REMOVE_REQUEST: 'content_remove',
  FRAGMENT_HEAD: 'frag_head',
  FRAGMENT_CONTENT: 'frag_cont',
}

const FRAGMENTING_LENGTH = 200

interface FragmentedMessageHead{
  type: string
  length: number
}
interface FragmentedMessage{
  c: number
  s: string
}

export class ConferenceSync{
  conference: Conference
  disposers: IReactionDisposer[] = []
  contentResponses = new Set<string>()  //  pids

  constructor(c:Conference) {
    this.conference = c
  }
  bind() {
    //  participant related -----------------------------------------------------------------------
    this.conference.on(ConferenceEvents.USER_LEFT, (id) => {
      participants.leave(id)
    })
    this.conference.on(ConferenceEvents.USER_JOINED, (id) => {
      if (this.conference._jitsiConference?.getParticipantById(id).getDisplayName() === contentTrackCarrierName) {

      }else {
        participants.join(id)
      }
    })
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
    //  pose
    this.conference.on(MessageType.PARTICIPANT_POSE, (from:string, pose:Pose2DMap) => {
      const remote = participants.remote.get(from)
      if (remote) {
        remote.pose.orientation = pose.orientation
        remote.pose.position = pose.position
      }
    })
    const sendPose = (to:string) => {
      const newPose = Object.assign({}, participants.local.pose)
      this.conference.sendMessage(MessageType.PARTICIPANT_POSE, to ? to : '', newPose)
    }
    this.disposers.push(autorun(() => { sendPose('') }))

        // mouse
    this.conference.on(MessageType.PARTICIPANT_MOUSE, (from:string, mouse:Mouse) => {
      const remote = participants.remote.get(from)
      if (remote) { Object.assign(remote.mouse, mouse) }
    })
    const sendMouse = (to: string) => {
      this.conference.sendMessage(MessageType.PARTICIPANT_MOUSE, '', Object.assign({}, participants.local.mouse))
    }
    this.disposers.push(autorun(() => { sendMouse('') }))


    // contents related ---------------------------------------------------------------
    this.conference.on(ConferenceEvents.USER_LEFT, (id) => {
      contents.onParticipantLeft(id)
    })
    //  main screen track's carrier id
    this.conference.on(MessageType.MAIN_SCREEN_CARRIER, (from: string, {carrierId, enable}) => {
      contents.tracks.onMainScreenCarrier(carrierId, enable)
    })
    //  my contents
    this.conference.on(MessageType.CONTENT_UPDATE_MINE, (from:string, cs_:ISharedContent[]) => {
      const cs = makeThemContents(cs_)
      contents.updateRemoteContents(cs, from)
      this.contentResponses.add(from)
      contentLog(`recv remote contents ${JSON.stringify(cs.map(c => c.id))} from ${from}.`, cs)
    })
    const sendMyContentsUpdated = (contents:ISharedContent[], to?: string) => {
      const contentsToSend = removePerceptibility(contents)
      contentLog(`send contents ${JSON.stringify(contentsToSend.map(c => c.id))} to ${to ? to : 'all'}.`,
                 contentsToSend)
      const total = contentsToSend.map(c => c.url.length).reduce((prev, cur) => prev + cur, 0)
      if (total > FRAGMENTING_LENGTH || contentsToSend.length > FRAGMENTING_LENGTH / 50) {
        this.sendFragmentedMessage(MessageType.CONTENT_UPDATE_MINE, to ? to : '', contentsToSend)
      }else {
        this.conference.sendMessage(MessageType.CONTENT_UPDATE_MINE, to ? to : '', contentsToSend)
      }
    }

    this.conference.on(MessageType.CONTENT_REMOVE_MINE, (from:string, cids:string[]) => {
      contents.removeRemoteContents(cids, from)
    })
    const sendMyContentsRemoved = (cids: string[]) => {
      if (cids.length) {
        this.conference.sendMessage(MessageType.CONTENT_REMOVE_MINE, '', cids)
      }
    }
    let myContentsOld:Map<string, ISharedContent> = new Map()
    this.disposers.push(autorun(() => {
      const com = intersectionMap(contents.localParticipant.myContents, myContentsOld)
      const added = diffMap(contents.localParticipant.myContents, com)
      const removed = diffMap(myContentsOld, com)
      if (added.size) {
        sendMyContentsUpdated(Array.from(added.values()))
      }
      if (removed.size) {
        sendMyContentsRemoved(Array.from(removed.keys()))
      }
      const updated = Array.from(com.values()).filter(v => v !== myContentsOld.get(v.id))
      if (updated.length) {
        sendMyContentsUpdated(updated)
      }
      myContentsOld = new Map(contents.localParticipant.myContents)
    }))

    //  request
    this.conference.on(MessageType.CONTENT_UPDATE_REQUEST, (from:string, c:ISharedContent) => {
      const content = makeItContent(c)
      contents.updateByRemoteRequest(content)
    })

    this.conference.on(MessageType.CONTENT_REMOVE_REQUEST, (from:string, cid:string) => {
      contents.removeByRemoteRequest(cid)
    })

    //  request info after join and got data channel.
    let requestSent = false
    this.conference._jitsiConference?.addEventListener(JitsiMeetJS.events.conference.DATA_CHANNEL_OPENED, () => {
      if (requestSent) { return }
      this.conference.sendMessage(MessageType.REQUEST_INFO, '', '')
      console.log('REQUEST_INFO sent by DATA_CHANNEL_OPENED.')
      requestSent = true
      setTimeout(this.checkResponse.bind(this), 1000)
    })
    const startTime = Date.now()
    this.conference.on(ConferenceEvents.REMOTE_TRACK_ADDED, () => {
      if (requestSent) { return }
      if (Date.now() - startTime < 10 * 1000) { return }
      this.conference.sendMessage(MessageType.REQUEST_INFO, '', '')
      console.log('REQUEST_INFO sent by REMOTE_TRACK_ADDED.')
      requestSent = true
      setTimeout(this.checkResponse.bind(this), 1000)
    })
    this.conference.on(MessageType.REQUEST_INFO, (from:string, none:Object) => {
      sendPose(from)
      sendMouse(from)
      sendMyContentsUpdated(Array.from(contents.localParticipant.myContents.values()), from)
      this.sendMainScreenCarrier(from, true)
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

  clear() {
    this.disposers.forEach(d => d())
  }

  private checkResponse() {
    const toSends = diffSet(new Set(participants.remote.keys()),  this.contentResponses)
    toSends.forEach((pid) => {
      this.conference.sendMessage(MessageType.REQUEST_INFO, pid, '')
    })
    if (toSends.size) {
      setTimeout(this.checkResponse.bind(this), 1000)
    }
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

  //  Send content update request to pid
  sendContentUpdateRequest(pid: string, updated: ISharedContent) {
    if (updated.url.length > FRAGMENTING_LENGTH) {
      this.sendFragmentedMessage(MessageType.CONTENT_UPDATE_REQUEST, pid, updated)
    }else {
      this.conference.sendMessage(MessageType.CONTENT_UPDATE_REQUEST, pid, updated)
    }
  }
  //  Send content remove request to pid
  sendContentRemoveRequest(pid: string, removed: string) {
    this.conference.sendMessage(MessageType.CONTENT_REMOVE_REQUEST, pid, removed)
  }
  //  send main screen carrir
  sendMainScreenCarrier(to: string, enable: boolean) {
    const carrierId = contents.tracks.localMainConnection?.getParticipantId()
    if (carrierId) {
      this.conference.sendMessage(MessageType.MAIN_SCREEN_CARRIER, to, {carrierId, enable})
    }
  }
}

//  remove unnessary info from contents to send.
function removePerceptibility(cs: ISharedContent[]): ISharedContent[] {
  const rv = []
  for (const c of cs) {
    const cc:any = Object.assign({}, c)
    delete cc.perceptibility
    rv.push(cc)
  }

  return rv
}
