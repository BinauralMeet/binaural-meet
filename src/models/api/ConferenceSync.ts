import {Pose2DMap} from '@models/MapObject'
import {priorityCalculator} from '@models/middleware/trafficControl'
import {Information, Mouse, Physics, TrackStates} from '@models/Participant'
import {SharedContent as ISharedContent} from '@models/SharedContent'
import {urlParameters} from '@models/url'
import participants from '@stores/participants/Participants'
import {extractContentDataAndIds, makeItContent, makeThemContents} from '@stores/sharedContents/SharedContentCreator'
import contents from '@stores/sharedContents/SharedContents'
import JitsiMeetJS from 'lib-jitsi-meet'
import _ from 'lodash'
import {autorun, IReactionDisposer} from 'mobx'
import {Conference, ConferenceEvents} from './Conference'
import {contentTrackCarrierName} from './ConnectionForScreenContent'

export const MessageType = {
  PARTICIPANT_POSE: 'm_pose',                   //  -> update presence once per 5 sec / message immediate value
  PARTICIPANT_MOUSE: 'm_mouse',                 //  -> message
  PARTICIPANT_TRACKLIMITS: 'm_track_limits',    //  -> message, basically does not sync
  DIRECT_REMOTES: 'direct_remotes',             //  -> message
  CONTENT_UPDATE_REQUEST: 'content_update',     //  -> message
  CONTENT_REMOVE_REQUEST: 'content_remove',     //  -> message
  FRAGMENT_HEAD: 'frag_head',
  FRAGMENT_CONTENT: 'frag_cont',
}
export const PropertyType = {
  PARTICIPANT_INFO: 'p_info',                   //  -> presence
  PARTICIPANT_POSE: 'p_pose',                   //  -> update presence once per 5 sec / message immediate value
  PARTICIPANT_PHYSICS: 'p_physics',             //  -> presence
  PARTICIPANT_TRACKSTATES: 'p_trackstates',     //  -> presence
  GHOSTS: 'p_ghosts',                           //  -> presence, should be removed
  MAIN_SCREEN_CARRIER: 'main_screen_carrier',   //  -> presence
  MY_CONTENT: 'my_content',                     //  -> presence
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
  sendMainScreenCarrier(enabled: boolean) {
    const carrierId = contents.tracks.localMainConnection?.getParticipantId()
    if (carrierId) {
      this.conference.setLocalParticipantProperty(PropertyType.MAIN_SCREEN_CARRIER, {carrierId, enabled})
    }
  }
  sendGhosts() {
    if (participants.ghosts.size) {
      this.conference.setLocalParticipantProperty(PropertyType.GHOSTS, Array.from(participants.ghosts))
      //  console.log(`my ghosts sent ${Array.from(participants.ghosts)}`)
    }
  }
  addGhosts(ghosts:string[]) {
    //  console.log(`add ghosts called ${ghosts}`)
    ghosts.forEach(g => participants.ghosts.add(g))
    const all = Array.from(participants.ghosts)
    all.forEach((g) => {
      if (participants.remote.has(g)) {
        contents.onParticipantLeft(g)
        participants.remote.delete(g)
      }
    })
  }

  sendMyContents() {
    const cs = Array.from(contents.localParticipant.myContents.values())
    const contentsToSend = extractContentDataAndIds(cs)
    syncLog(`send all contents ${JSON.stringify(contentsToSend.map(c => c.id))}.`,
            contentsToSend)
    this.conference.setLocalParticipantProperty(PropertyType.MY_CONTENT, contentsToSend)
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
    this.conference.on(PropertyType.PARTICIPANT_INFO, (from:string, info:Information) => {
      if (urlParameters.testBot !== null) { return }

      const remote = participants.remote.get(from)
      if (remote) {
        Object.assign(remote.information, info)
      }
    })
    const sendInfo = () => {
      this.conference.setLocalParticipantProperty(PropertyType.PARTICIPANT_INFO, {...participants.local.information})
    }
    this.disposers.push(autorun(sendInfo))

    //  track states
    this.conference.on(PropertyType.PARTICIPANT_TRACKSTATES, (from:string, states:TrackStates) => {
      if (urlParameters.testBot !== null) { return }

      const remote = participants.remote.get(from)
      if (remote) {
        Object.assign(remote.trackStates, states)
      }
    })
    const sendTrackStates = () => {
      this.conference.setLocalParticipantProperty(PropertyType.PARTICIPANT_TRACKSTATES,
                                                  {...participants.local.trackStates})
    }
    this.disposers.push(autorun(sendTrackStates))

    //  pose
    const onPose = (from:string, pose:Pose2DMap) => {
      const remote = participants.remote.get(from)
      if (remote) {
        remote.pose.orientation = pose.orientation
        remote.pose.position = pose.position
        remote.physics.located = true
      }
    }
    this.conference.on(MessageType.PARTICIPANT_POSE, onPose)
    this.conference.on(PropertyType.PARTICIPANT_POSE, onPose)
    let updateTime = 0
    let poseWait = 0
    const calcWait = () => Math.ceil(Math.max((participants.remote.size / 5) * 20, 20))

    let sendPoseMessage: (pose:Pose2DMap) => void
    this.disposers.push(autorun(() => {
      const pose = {...participants.local.pose}
      const now = Date.now()
      if (now - updateTime > 5 * 1000) {  //  update every 5 sec
        this.conference.setLocalParticipantProperty(PropertyType.PARTICIPANT_POSE, pose)
        updateTime = Date.now()
      }
      const newWait = calcWait()
      if (newWait !== poseWait) {
        poseWait = newWait
        sendPoseMessage = _.throttle((pose:Pose2DMap) => {
          this.conference.sendMessage(MessageType.PARTICIPANT_POSE, '', pose)
        },                           poseWait)  //  30fps
      }

      if (this.conference.channelOpened) {
        sendPoseMessage(pose)
      }
    }))

    // mouse
    this.conference.on(MessageType.PARTICIPANT_MOUSE, (from:string, mouse:Mouse) => {
      if (urlParameters.testBot !== null) { return }
      const remote = participants.remote.get(from)
      if (remote) { Object.assign(remote.mouse, mouse) }
    })
    let wait = 0
    let sendMouseMessage: (mouse:Mouse) => void
    const sendMouse = (to: string) => {
      const newWait = calcWait()
      if (wait !== newWait) {
        wait = newWait
        sendMouseMessage = _.throttle((mouse: Mouse) => {
          this.conference.sendMessage(MessageType.PARTICIPANT_MOUSE, '', mouse)
        },                            wait)
      }
      if (this.conference.channelOpened) {
        sendMouseMessage({...participants.local.mouse})
      }
    }
    this.disposers.push(autorun(() => { sendMouse('') }))


    // physics
    this.conference.on(PropertyType.PARTICIPANT_PHYSICS, (from:string, physics:Physics) => {
      if (urlParameters.testBot !== null) { return }

      const remote = participants.remote.get(from)
      if (remote) {
        remote.physics.onStage = physics.onStage
      }
    })
    const sendPhysics = () => {
      if (this.conference.channelOpened) {
        this.conference.setLocalParticipantProperty(PropertyType.PARTICIPANT_PHYSICS, {...participants.local.physics})
      }
    }
    this.disposers.push(autorun(() => { sendPhysics() }))

    //  direct remotes
    this.conference.on(MessageType.DIRECT_REMOTES, (from:string, drArray:string[]) => {
      const myself = drArray.find(id => id === participants.localId)
      if (myself) {
        participants.directRemotes.add(from)
      }else {
        participants.directRemotes.delete(from)
      }
    })
    const sendDirectRemotes = () => {
      if (this.conference.channelOpened) {
        this.conference.sendMessage(MessageType.DIRECT_REMOTES, '', Array.from(participants.directRemotes))
      }
    }
    this.disposers.push(autorun(() => { sendDirectRemotes() }))

    //  ghost pids
    this.conference.on(PropertyType.GHOSTS, (from:string, ghosts:string[]) => {
      this.addGhosts(ghosts)
    })
    this.disposers.push(autorun(() => { this.sendGhosts() }))
    this.disposers.push(autorun(() => { this.addGhosts([]) }))

    // contents related ---------------------------------------------------------------
    this.conference.on(ConferenceEvents.USER_LEFT, (id) => {
      contents.onParticipantLeft(id)
    })
    //  main screen track's carrier id
    this.conference.on(PropertyType.MAIN_SCREEN_CARRIER, (from: string, {carrierId, enabled}) => {
      const remote = participants.remote.get(from)
      if (remote) {
        contents.tracks.onMainScreenCarrier(carrierId, enabled)
      }
    })
    //  my contents
    //  Send my content to remote to refresh.
    this.conference.on(PropertyType.MY_CONTENT, (from:string, cs_:ISharedContent[]) => {
      const cs = makeThemContents(cs_)
      contents.checkDuplicatedBackground(from, cs)
      contents.replaceRemoteContents(cs, from)
      const remote = participants.remote.get(from)
      syncLog(`recv remote contents ${JSON.stringify(cs.map(c => c.id))} from ${from}.`, cs)
    })
    this.disposers.push(autorun(() => {
      const cs = extractContentDataAndIds(Array.from(contents.localParticipant.myContents.values()))
      this.conference.setLocalParticipantProperty(PropertyType.MY_CONTENT, cs)
    }))
    //  request
    this.conference.on(MessageType.CONTENT_UPDATE_REQUEST, (from:string, c:ISharedContent) => {
      const content = makeItContent(c)
      contents.updateByRemoteRequest(content)
    })
    this.conference.on(MessageType.CONTENT_REMOVE_REQUEST, (from:string, cid:string) => {
      contents.removeByRemoteRequest(cid)
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
  clear() {
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
}
