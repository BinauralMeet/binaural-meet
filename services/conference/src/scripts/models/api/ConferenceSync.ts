import {Pose2DMap} from '@models/MapObject'
import {Mouse} from '@models/Participant'
import {SharedContent as ISharedContent} from '@models/SharedContent'
import {diffMap, intersectionMap} from '@models/utils'
import participants from '@stores/participants/Participants'
import {makeItContent, makeThemContents} from '@stores/sharedContents/SharedContentCreator'
import contents, {contentLog} from '@stores/sharedContents/SharedContents'
import JitsiMeetJS from 'lib-jitsi-meet'
import _ from 'lodash'
import {autorun, IReactionDisposer} from 'mobx'
import {Conference, ConferenceEvents} from './Conference'

export const MessageType = {
  REQUEST_INFO: 'req_info',
  PARTICIPANT_POSE: 'participant_pose',
  PARTICIPANT_MOUSE: 'participant_mouse',
  PARTICIPANT_PHYSICS: 'participant_physics',
  CONTENT_UPDATE_MINE: 'content_update_mine',
  CONTENT_REMOVE_MINE: 'content_remove_mine',
  CONTENT_UPDATE_REQUEST: 'content_update',
  CONTENT_REMOVE_REQUEST: 'content_remove',
}


export class ConferenceSync{
  conference: Conference
  disposers: IReactionDisposer[] = []

  constructor(c:Conference) {
    this.conference = c
  }
  bind() {
    //  participant related -----------------------------------------------------------------------
    this.conference.addListener(ConferenceEvents.PARTICIPANT_LEFT, (id) => {
      participants.leave(id)
    })

    //  pose
    this.conference.addListener(MessageType.PARTICIPANT_POSE, (from:string, pose:Pose2DMap) => {
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
    this.conference.addListener(MessageType.PARTICIPANT_MOUSE, (from:string, mouse:Mouse) => {
      const remote = participants.remote.get(from)
      if (remote) { Object.assign(remote.mouse, mouse) }
    })
    const sendMouse = (to: string) => {
      this.conference.sendMessage(MessageType.PARTICIPANT_MOUSE, '', Object.assign({}, participants.local.mouse))
    }
    this.disposers.push(autorun(() => { sendMouse('') }))


    // contents related ---------------------------------------------------------------
    this.conference.addListener(ConferenceEvents.PARTICIPANT_LEFT, (id) => {
      contents.onParticipantLeft(id)
    })
    //  my contents
    this.conference.addListener(MessageType.CONTENT_UPDATE_MINE, (from:string, cs_:ISharedContent[]) => {
      const cs = makeThemContents(cs_)
      contents.updateRemoteContents(cs, from)
    })
    const sendMyContentsUpdated = (contents:ISharedContent[], to?: string) => {
      if (contents.length) {
        const contentsToSend = removePerceptibility(contents)
        contentLog('send contents: ', contentsToSend)
        this.conference.sendMessage(MessageType.CONTENT_UPDATE_MINE, to ? to : '', contentsToSend)
      }
    }

    this.conference.addListener(MessageType.CONTENT_REMOVE_MINE, (from:string, cids:string[]) => {
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
      sendMyContentsUpdated(Array.from(added.values()))
      sendMyContentsRemoved(Array.from(removed.keys()))
      const updated = Array.from(com.values()).filter(v => v !== myContentsOld.get(v.id))
      sendMyContentsUpdated(updated)
      myContentsOld = new Map(contents.localParticipant.myContents)
    }))

    //  request
    this.conference.addListener(MessageType.CONTENT_UPDATE_REQUEST, (from:string, c:ISharedContent) => {
      const content = makeItContent(c)
      contents.updateByRemoteRequest(content)
    })

    this.conference.addListener(MessageType.CONTENT_REMOVE_REQUEST, (from:string, cid:string) => {
      contents.removeByRemoteRequest(cid)
    })

    //  request info after join and got data channel.
    this.conference._jitsiConference?.addEventListener(JitsiMeetJS.events.conference.DATA_CHANNEL_OPENED, () => {
      this.conference.sendMessage(MessageType.REQUEST_INFO, '', '')
    })
    this.conference.addListener(MessageType.REQUEST_INFO, (from:string, none:Object) => {
      sendPose(from)
      sendMouse(from)
      sendMyContentsUpdated(Array.from(contents.localParticipant.myContents.values()), from)
    })
  }
  clear() {
    this.disposers.forEach(d => d())
  }

  //  Utilities
  //  Send content update request to pid
  sendContentUpdateRequest(pid: string, updated: ISharedContent) {
    this.conference.sendMessage(MessageType.CONTENT_UPDATE_REQUEST, pid, updated)
  }
  //  Send content remove request to pid
  sendContentRemoveRequest(pid: string, removed: string) {
    this.conference.sendMessage(MessageType.CONTENT_REMOVE_REQUEST, pid, removed)
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
