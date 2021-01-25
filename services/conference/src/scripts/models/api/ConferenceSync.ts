import {Pose2DMap} from '@models/MapObject'
import {priorityCalculator} from '@models/middleware/trafficControl'
import {Information, Mouse, Physics, TrackStates} from '@models/Participant'
import {SharedContent as ISharedContent} from '@models/SharedContent'
import {diffMap, diffSet, intersectionMap} from '@models/utils'
import participants from '@stores/participants/Participants'
import {RemoteParticipant} from '@stores/participants/RemoteParticipant'
import {makeItContent, makeThemContents} from '@stores/sharedContents/SharedContentCreator'
import contents from '@stores/sharedContents/SharedContents'
import JitsiMeetJS from 'lib-jitsi-meet'
import _ from 'lodash'
import {autorun, IReactionDisposer} from 'mobx'
import {Conference, ConferenceEvents} from './Conference'
import {contentTrackCarrierName} from './ConnectionForScreenContent'

export const MessageType = {
  REQUEST_INFO: 'req_info',
  PARTICIPANT_INFO: 'participant_info',
  PARTICIPANT_POSE: 'participant_pose',
  PARTICIPANT_MOUSE: 'participant_mouse',
  PARTICIPANT_PHYSICS: 'participant_physics',
  PARTICIPANT_TRACKSTATES: 'participant_trackstates',
  PARTICIPANT_TRACKLIMITS: 'participant_track_limits',
  DIRECT_REMOTES: 'direct_remotes',
  MAIN_SCREEN_CARRIER: 'main_screen_carrier',
  CONTENT_ALL: 'content_all',
  CONTENT_UPDATED: 'content_updated',
  CONTENT_REMOVED: 'content_removed',
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

const SYNC_LOG = false
const syncLog = SYNC_LOG ? console.log : () => {}

export class ConferenceSync{
  conference: Conference
  disposers: IReactionDisposer[] = []

  constructor(c:Conference) {
    this.conference = c
  }
  sendTrackLimits(to:string, limits?:string[]) {
    this.conference.sendMessage(MessageType.PARTICIPANT_TRACKLIMITS, to ? to : '', limits ? limits :
                                [participants.local.remoteVideoLimit, participants.local.remoteAudioLimit])
  }
  bind() {
    //  participant related -----------------------------------------------------------------------
    //  track limit
    this.conference.on(MessageType.PARTICIPANT_TRACKLIMITS, (from:string, limits:string[]) => {
      participants.local.remoteVideoLimit = limits[0]
      participants.local.remoteAudioLimit = limits[1]
    })

    //  left/join
    this.conference.on(ConferenceEvents.USER_LEFT, (id) => {
      participants.leave(id)
    })
    this.conference.on(ConferenceEvents.USER_JOINED, (id) => {
      if (this.conference._jitsiConference?.getParticipantById(id).getDisplayName() === contentTrackCarrierName) {

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

    //  info
    this.conference.on(MessageType.PARTICIPANT_INFO, (from:string, info:Information) => {
      const remote = participants.remote.get(from)
      if (remote) {
        remote.updateTime.info = Date.now()
        Object.assign(remote.information, info)
      }
    })
    const sendInfo = (to:string) => {
      if (this.conference.channelOpened) {
        this.conference.sendMessage(MessageType.PARTICIPANT_INFO, to ? to : '', {...participants.local.information})
      }
    }
    this.disposers.push(autorun(() => sendInfo('')))

    //  track states
    this.conference.on(MessageType.PARTICIPANT_TRACKSTATES, (from:string, states:TrackStates) => {
      const remote = participants.remote.get(from)
      if (remote) {
        remote.updateTime.trackStates = Date.now()
        Object.assign(remote.trackStates, states)
      }
    })
    const sendTrackStates = (to:string) => {
      if (this.conference.channelOpened) {
        this.conference.sendMessage(MessageType.PARTICIPANT_TRACKSTATES,
                                    to ? to : '', {...participants.local.trackStates})
      }
    }
    this.disposers.push(autorun(() => { sendTrackStates('') }))

    //  pose
    this.conference.on(MessageType.PARTICIPANT_POSE, (from:string, pose:Pose2DMap) => {
      const remote = participants.remote.get(from)
      if (remote) {
        remote.updateTime.pose = Date.now()
        remote.pose.orientation = pose.orientation
        remote.pose.position = pose.position
        remote.physics.located = true
      }
    })
    const sendPose = (to:string) => {
      if (this.conference.channelOpened) {
        const newPose = Object.assign({}, participants.local.pose)
        this.conference.sendMessage(MessageType.PARTICIPANT_POSE, to ? to : '', newPose)
      }
    }
    this.disposers.push(autorun(() => { sendPose('') }))

    // physics
    this.conference.on(MessageType.PARTICIPANT_PHYSICS, (from:string, physics:Physics) => {
      const remote = participants.remote.get(from)
      if (remote) {
        remote.updateTime.physhics = Date.now()
        remote.physics.onStage = physics.onStage
      }
    })
    const sendPhysics = (to:string) => {
      if (this.conference.channelOpened) {
        this.conference.sendMessage(MessageType.PARTICIPANT_PHYSICS, to ? to : '', {...participants.local.physics})
      }
    }
    this.disposers.push(autorun(() => { sendPhysics('') }))

    // mouse
    this.conference.on(MessageType.PARTICIPANT_MOUSE, (from:string, mouse:Mouse) => {
      const remote = participants.remote.get(from)
      if (remote) {
        remote.updateTime.mouse = Date.now()
        Object.assign(remote.mouse, mouse)
      }
    })
    const sendMouse = (to: string) => {
      if (this.conference.channelOpened) {
        this.conference.sendMessage(MessageType.PARTICIPANT_MOUSE, '', Object.assign({}, participants.local.mouse))
      }
    }
    this.disposers.push(autorun(() => { sendMouse('') }))

    //  direct remotes
    this.conference.on(MessageType.DIRECT_REMOTES, (from:string, drArray:string[]) => {
      const myself = drArray.find(id => id === participants.localId)
      if (myself) {
        participants.directRemotes.add(from)
      }else {
        participants.directRemotes.delete(from)
      }
    })
    const sendDirectRemotes = (to: string) => {
      if (this.conference.channelOpened) {
        this.conference.sendMessage(MessageType.DIRECT_REMOTES, '', Array.from(participants.directRemotes))
      }
    }
    this.disposers.push(autorun(() => { sendDirectRemotes('') }))

    // contents related ---------------------------------------------------------------
    this.conference.on(ConferenceEvents.USER_LEFT, (id) => {
      contents.onParticipantLeft(id)
    })
    //  main screen track's carrier id
    this.conference.on(MessageType.MAIN_SCREEN_CARRIER, (from: string, {carrierId, enable}) => {
      const remote = participants.remote.get(from)
      if (remote) {
        remote.updateTime.mainScreenCarrier = Date.now()
        contents.tracks.onMainScreenCarrier(carrierId, enable)
      }
    })
    //  my contents
    //  Part of my contents updated and send them to remote.
    this.conference.on(MessageType.CONTENT_UPDATED, (from:string, cs_:ISharedContent[]) => {
      const cs = makeThemContents(cs_)
      contents.updateRemoteContents(cs, from)
      syncLog(`recv remote contents ${JSON.stringify(cs.map(c => c.id))} from ${from}.`, cs)
    })
    const sendMyContentsUpdated = (contents:ISharedContent[], to?: string) => {
      const contentsToSend = removePerceptibility(contents)
      syncLog(`send contents ${JSON.stringify(contentsToSend.map(c => c.id))} to ${to ? to : 'all'}.`,
              contentsToSend)
      this.doSendContent(MessageType.CONTENT_UPDATED, contentsToSend, to)
    }
    //  Send all my content to remote to refresh.
    this.conference.on(MessageType.CONTENT_ALL, (from:string, cs_:ISharedContent[]) => {
      const cs = makeThemContents(cs_)
      contents.replaceRemoteContents(cs, from)
      const remote = participants.remote.get(from)
      if (remote) {
        remote.updateTime.contents = Date.now()
      }
      syncLog(`recv remote contents ${JSON.stringify(cs.map(c => c.id))} from ${from}.`, cs)
    })

    //  remove
    this.conference.on(MessageType.CONTENT_REMOVED, (from:string, cids:string[]) => {
      contents.removeRemoteContents(cids, from)
    })
    const sendMyContentsRemoved = (cids: string[]) => {
      if (cids.length) {
        this.conference.sendMessage(MessageType.CONTENT_REMOVED, '', cids)
      }
    }
    let myContentsOld:Map<string, ISharedContent> = new Map()
    this.disposers.push(autorun(() => {
      if (this.conference.channelOpened) {
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
      }
    }))

    this.conference.on(MessageType.CONTENT_UPDATED, (from:string, cs_:ISharedContent[]) => {
      const cs = makeThemContents(cs_)
      contents.updateRemoteContents(cs, from)
      syncLog(`recv remote contents ${JSON.stringify(cs.map(c => c.id))} from ${from}.`, cs)
    })

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
      this.conference.channelOpened = true
      if (requestSent) { return }
      this.conference.sendMessage(MessageType.REQUEST_INFO, '', '')
      syncLog('REQUEST_INFO sent by DATA_CHANNEL_OPENED.')
      requestSent = true
      setTimeout(this.checkResponse.bind(this), 1000)
    })
    const startTime = Date.now()
    this.conference.on(ConferenceEvents.REMOTE_TRACK_ADDED, () => {
      if (requestSent) { return }
      if (Date.now() - startTime < 10 * 1000) { return }
      this.conference.sendMessage(MessageType.REQUEST_INFO, '', '')
      console.warn('REQUEST_INFO sent by REMOTE_TRACK_ADDED.')
      requestSent = true
      setTimeout(this.checkResponse.bind(this), 1000)
    })
    this.conference.on(MessageType.REQUEST_INFO, (from:string, none:Object) => {
      sendPose(from)
      sendMouse(from)
      sendInfo(from)
      sendPhysics(from)
      sendTrackStates(from)
      this.sendTrackLimits(from)
      this.sendAllMyContents(from)
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
    const remotes = Array.from(participants.remote.values())
    const noRes = remotes.filter(remote => remote.updateTime.hasNoResponse())
    noRes.forEach((remote) => {
      this.conference.sendMessage(MessageType.REQUEST_INFO, remote.id, '')
    })
    const olds:RemoteParticipant[] = []
    //  const olds = remotes.filter(remote => remote.updateTime.hasOlderThan(Date.now() - 60 * 1000))
    olds.forEach((remote) => {
      this.conference.sendMessage(MessageType.REQUEST_INFO, remote.id, '')
    })
    if (noRes.length) {
      console.warn(`Failed to get response from ${JSON.stringify(noRes.map(r => r.id))}`)
    }
    setTimeout(this.checkResponse.bind(this), 1000)
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
    }else {
      this.conference.sendMessage(MessageType.MAIN_SCREEN_CARRIER, to, {carrierId, enable:false})
    }
  }

  doSendContent(type:string, contentsToSend:ISharedContent[], to?:string) {
    const total = contentsToSend.map(c => c.url.length).reduce((prev, cur) => prev + cur, 0)
    if ((total + contentsToSend.length * 40) > FRAGMENTING_LENGTH) {
      this.sendFragmentedMessage(type, to ? to : '', contentsToSend)
    }else {
      this.conference.sendMessage(type, to ? to : '', contentsToSend)
    }
  }

  sendAllMyContents(to?: string) {
    const cs = Array.from(contents.localParticipant.myContents.values())
    const contentsToSend = removePerceptibility(cs)
    syncLog(`send all contents ${JSON.stringify(contentsToSend.map(c => c.id))} to ${to ? to : 'all'}.`,
            contentsToSend)
    this.doSendContent(MessageType.CONTENT_ALL, contentsToSend, to)
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
