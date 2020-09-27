import {defaultPerceptibility, Pose2DMap} from '@models/MapObject'
import {Information, Physics} from '@models/Participant'
import {SharedContent as ISharedContent} from '@models/SharedContent'
import {participantsStore} from '@stores/participants'
import {LocalParticipant} from '@stores/participants/LocalParticipant'
import {default as ParticiantsStore} from '@stores/participants/Participants'
import {contentDebug, contentLog, default as sharedContents} from '@stores/sharedContents/SharedContents'
import {EventEmitter} from 'events'
import JitsiMeetJS, {JitisTrackError, JitsiValues} from 'lib-jitsi-meet'
import JitsiParticipant from 'lib-jitsi-meet/JitsiParticipant'
import JitsiLocalTrack from 'lib-jitsi-meet/modules/RTC/JitsiLocalTrack'
import JitsiRemoteTrack from 'lib-jitsi-meet/modules/RTC/JitsiRemoteTrack'
import JitsiTrack, {TMediaType} from 'lib-jitsi-meet/modules/RTC/JitsiTrack'
import {autorun} from 'mobx'
import {throttle} from 'throttle-debounce'
import {connDebug, Connection, connLog, trackLog, TRACKLOG} from './Connection'

// config.js
declare const config:any                  //  from ../../config.js included from index.html

const ConferenceEvents = {
  CONFERENCE_JOINED: 'conference_joined',
  REMOTE_PARTICIPANT_JOINED: 'remote_participant_joined',
  LOCAL_PARTICIPANT_JOINED: 'local_participant_joined',
  REMOTE_TRACK_ADDED: 'remote_track_added',
  LOCAL_TRACK_ADDED: 'local_track_added',
  REMOTE_TRACK_REMOVED: 'remote_track_removed',
  LOCAL_TRACK_REMOVED: 'local_track_removed',
  PARTICIPANT_LEFT: 'participant_left',
}

const ParticipantProperties = {
  PPROP_POSE: 'pose',
  PPROP_MOUSE_POSITION: 'mouse',
  PPROP_CONTENTS: 'contents',
  PPROP_CONTENTS_UPDATE: 'contents_update',
  PPROP_CONTENTS_REMOVE: 'contents_remove',
  PPROP_INFO: 'info',
  PPROP_PHYSICS: 'physics',
}

//  Utility
function removePerceptibility(cs: ISharedContent[]):any {
  const rv = []
  for (const c of cs) {
    const cc:any = Object.assign({}, c)
    delete cc.perceptibility
    rv.push(cc)
  }

  return rv
}
function addPerceptibility(cs: any[], perceptibility = defaultPerceptibility):ISharedContent[] {
  const rv = []
  for (const c of cs) {
    const cc:any = Object.assign({}, c)
    cc.perceptibility = Object.assign({}, defaultPerceptibility)
    rv.push(cc)
  }

  return rv
}


export class Conference extends EventEmitter {
  private _jitsiConference?: JitsiMeetJS.JitsiConference
  private _isForTest?: boolean
  public localId = ''

  public init(jc: JitsiMeetJS.JitsiConference, isForTest: boolean) {
    this.registerEventHandlers()
    this._jitsiConference = jc
    this._isForTest = isForTest
    this.registerJistiConferenceEvents(this._jitsiConference)
    this._jitsiConference.join('')
  }

  //  Commmands for shared contents
  public sendSharedContents(cs: ISharedContent[]) {
    const ccs = removePerceptibility(cs)
    contentLog('send contents: ', ccs)
    this._jitsiConference?.setLocalParticipantProperty(ParticipantProperties.PPROP_CONTENTS, JSON.stringify(ccs))
  }
  public sendSharedContentsUpdateRequest(cs: ISharedContent[]) {
    const ccs = removePerceptibility(cs)
    contentLog('send contents update request: ', ccs)
    this._jitsiConference?.setLocalParticipantProperty(ParticipantProperties.PPROP_CONTENTS_UPDATE, JSON.stringify(ccs))
  }
  public sendSharedContentsRemoveRequest(ids: string[]) {
    contentLog('send contents remove request: ', ids)
    this._jitsiConference?.setLocalParticipantProperty(ParticipantProperties.PPROP_CONTENTS_REMOVE, JSON.stringify(ids))
  }
  public getSharedContents(pid: string): ISharedContent[] {
    const participant = this._jitsiConference?.getParticipantById(pid)
    if (participant) {
      const str = participant.getProperty(ParticipantProperties.PPROP_CONTENTS)
      if (str && str.length > 0) {
        const cs = addPerceptibility(JSON.parse(str))

        return cs
      }
    }

    return []
  }

  //  generic send command
  public sendCommand(name: string, values: JitsiValues) {
    this._jitsiConference?.sendCommand(name, values)
  }
  public removeCommand(name: string) {
    this._jitsiConference?.removeCommand(name)
  }

  //  Send local participant's property
  private sendLocalParticipantInformationDisposer = autorun(
    () => {
      const info = {...ParticiantsStore.local.get().information}
      this._jitsiConference?.setLocalParticipantProperty(ParticipantProperties.PPROP_INFO, JSON.stringify(info))
      //  console.log('LocalParticipantInfo sent.', info)
    },
  )
  private sendLocalParticipantPhysicsDisposer = autorun(
    () => {
      const physics = {...ParticiantsStore.local.get().physics}
      this._jitsiConference?.setLocalParticipantProperty(ParticipantProperties.PPROP_PHYSICS, JSON.stringify(physics))
      //  console.log('LocalParticipantPhysics sent.', physics)
    },
  )
  //  send participant's pose
  private bindStore(local: LocalParticipant) {
    const UPDATE_INTERVAL = 200

    const throttledUpdatePose = throttle(UPDATE_INTERVAL, (newPose: Pose2DMap) => {
      this._jitsiConference?.setLocalParticipantProperty(ParticipantProperties.PPROP_POSE, JSON.stringify(newPose))
    })
    const disposer = autorun(
      () => {
        const newPose = {
          position: local.pose.position,
          orientation: local.pose.orientation,
        }
        throttledUpdatePose(newPose)
      },
    )
    //  send mouse position
    const throttledUpdateMousePosition = throttle(UPDATE_INTERVAL, (mousePos: [number, number]|undefined) => {
      const str = mousePos ? JSON.stringify(mousePos) : ''
      this._jitsiConference?.setLocalParticipantProperty(ParticipantProperties.PPROP_MOUSE_POSITION, str)
    })
    const disposerMouse = autorun(
      () => {
        throttledUpdateMousePosition(local.mousePosition)
      },
    )
  }


  /**
   * reduce bit rate
   * peerconnection as TraceablePeerConnection
   * peerconnection.peerconnection as RTCPeerConnection */
  private reduceBitrate() {
    if (config.rtc && this._jitsiConference && this._jitsiConference.jvbJingleSession) {
      const jingleSession = this._jitsiConference.jvbJingleSession
      if (!jingleSession.bitRateAlreadyReduced && jingleSession.peerconnection.peerconnection) {
        jingleSession.bitRateAlreadyReduced = true
        const pc = jingleSession.peerconnection.peerconnection
        // console.log('RTCPeerConnect:', pc)
        pc.getSenders().forEach((sender) => {
          // console.log(sender)
          if (sender && sender.track) {
            const params = sender.getParameters()
            // console.log('params:', params)
            params.encodings.forEach((encording) => {
              const ONE_KILO = 1024
              if (sender.track!.kind === 'video' && config.rtc.maxBitrateForVideo) {
                encording.maxBitrate = config.rtc.maxBitrateForVideo * ONE_KILO
              }else if (sender.track!.kind === 'audio') {
                encording.maxBitrate = config.rtc.maxBitrateForAudio * ONE_KILO
              }
            })
            sender.setParameters(params)
          }
        })
      }
    }
  }

  //  event handlers
  /**
   * Bind lib-jitsi-meet events to party events.
   * @param conference Conference instance of JitsiMeet
   */
  private registerJistiConferenceEvents(conference: JitsiMeetJS.JitsiConference) {
    const logField = 'JistiEvent'

    /**
     * Event: JitsiMeetJS.events.conference.CONFERENCE_JOINED
     * @emits ConnectionEvents.LOCAL_PARTICIPANT_JOINED
     */
    conference.on(
      JitsiMeetJS.events.conference.CONFERENCE_JOINED,
      () => {
        connLog('Joined a conference room.', logField)
        this.emit(ConferenceEvents.LOCAL_PARTICIPANT_JOINED)
      },
    )
    /**
     * Event: JitsiMeetJS.events.conference.USER_JOINED
     * @emits ConferenceEvents.REMOTE_PARTICIPANT_JOINED
     */
    conference.on(
      JitsiMeetJS.events.conference.USER_JOINED,
      (id: string, user: JitsiParticipant) => {
        connLog(`New participant[${id}] joined.`, logField)
        this.emit(
          ConferenceEvents.REMOTE_PARTICIPANT_JOINED,
          id,
          {jitsiInstance: user, isLocal: false},
        )
      },
    )
    /**
     * Event: JitsiMeetJS.events.conference.USER_LEFT
     * @emits ConferenceEvents.USER_LEFT
     */
    conference.on(
      JitsiMeetJS.events.conference.USER_LEFT,
      (id: string, user: JitsiParticipant) => {
        connLog('A participant left.', logField)
        this.emit(
          ConferenceEvents.PARTICIPANT_LEFT,
          id,
        )
      },
    )
    /**
     * Event: JitsiMeetJS.events.conference.TRACK_ADDED
     * @emits ConferenceEvents.LOCAL_TRACK_ADDED
     * @emits ConferenceEvents.REMOTE_TRACK_ADDED
     */
    conference.on(
      JitsiMeetJS.events.conference.TRACK_ADDED,
      (track: JitsiTrack) => {
        trackLog(`TRACK_ADDED: ${track} type:${track.getType()} usage:${track.getUsageLabel()} tid:${track.getId()} msid:${track.getOriginalStream().id}`)

        if (track.isLocal()) {
          this.emit(
            ConferenceEvents.LOCAL_TRACK_ADDED,
            track as JitsiLocalTrack,
          )
        } else {
          if ((track as JitsiRemoteTrack).isP2P) {
            //  this._loggerHandler?.log(
            //    `P2P Remote PID: ${(<JitsiRemoteTrack>track).getParticipantId()}`, 'TRACK_ADDED')
            this.emit(
              ConferenceEvents.REMOTE_TRACK_ADDED,
              track as JitsiRemoteTrack,
            )
          }else {
            //  this._loggerHandler?.log(
            //    `JVB Remote PID: ${(<JitsiRemoteTrack>track).getParticipantId()}`, 'TRACK_ADDED')
            this.emit(
              ConferenceEvents.REMOTE_TRACK_ADDED,
              track as JitsiRemoteTrack,
            )
            this.reduceBitrate()
          }
        }
      },
    )

    /**
     * Event: JitsiMeetJS.events.conference.TRACK_REMOVED
     * @emits ConferenceEvents.LOCAL_TRACK_REMOVED
     * @emits ConferenceEvents.REMOTE_TRACK_REMOVED
     */
    conference.on(
      JitsiMeetJS.events.conference.TRACK_REMOVED,
      (track: JitsiTrack) => {
        trackLog(`TRACK_REMOVED: ${track} type:${track.getType()} ${track.getUsageLabel()} tid:${track.getId()} msid:${track.getOriginalStream().id}`)

        if (track.isLocal()) {
          this.emit(
            ConferenceEvents.LOCAL_TRACK_REMOVED,
            track as JitsiLocalTrack,
          )
        } else {
          if ((track as JitsiRemoteTrack).isP2P) {
            //  this._loggerHandler?.log(
            //    `P2P Remote participant ID: ${(<JitsiRemoteTrack>track).getParticipantId()}`, 'TRACK_REMOVED')
            this.emit(
              ConferenceEvents.REMOTE_TRACK_REMOVED,
              track as JitsiRemoteTrack,
            )
          }else {
            //  this._loggerHandler?.log(
            //    `JVB Remote  participant ID: ${(<JitsiRemoteTrack>track).getParticipantId()}`, 'TRACK_REMOVED')
            this.emit(
              ConferenceEvents.REMOTE_TRACK_REMOVED,
              track as JitsiRemoteTrack,
            )
          }
        }
      },
    )

    /**
     * Event: JitsiMeetJS.events.conference.TRACK_MUTE_CHANGED
     * @emits ConferenceEvents.TRACK_MUTE_CHANGED
     */
    conference.on(
      JitsiMeetJS.events.conference.TRACK_MUTE_CHANGED,
      (track: JitsiTrack) => {
        trackLog(`TRACK_MUTE_CHANGED on ${track}.`)
        if (track.isLocal()) { return }
        const remoteTrack = track as JitsiRemoteTrack
        const target = ParticiantsStore.find(remoteTrack.getParticipantId())
        if (target && remoteTrack.isVideoTrack() && !remoteTrack.isScreenSharing()) {
          target.plugins.streamControl.muteVideo = remoteTrack.isMuted()
        }
      },
    )

    conference.on(
      JitsiMeetJS.events.conference.PARTICIPANT_PROPERTY_CHANGED,
      (participant: JitsiParticipant, name: string, oldValue: string, value: string) => {
        connDebug('Participant property has changed.')

        // Change store
        const local = ParticiantsStore.local.get()
        if (name === ParticipantProperties.PPROP_POSE) {
          const pose: Pose2DMap = JSON.parse(value)
          const id = participant.getId()
          const target = ParticiantsStore.find(id)
          if (target) {
            target.pose.orientation = pose.orientation
            target.pose.position = pose.position
          }
        }else if (name === ParticipantProperties.PPROP_MOUSE_POSITION) {
          const target = ParticiantsStore.find(participant.getId())
          if (target) {
            if (value.length > 0) {
              target.mousePosition = JSON.parse(value)
            }else {
              target.mousePosition = undefined
            }
          }
        }else if (name === ParticipantProperties.PPROP_INFO) {
          const id = participant.getId()
          if (id !== local.id) {
            const target = ParticiantsStore.find(id)
            const info: Information = JSON.parse(value)
            if (target) {
              Object.assign(target.information, info)
            }
          }
        }else if (name === ParticipantProperties.PPROP_PHYSICS) {
          const id = participant.getId()
          if (id !== local.id) {
            const target = ParticiantsStore.find(id)
            const physics: Physics = JSON.parse(value)
            if (target) {
              Object.assign(target.physics, physics)
            }
          }
        }else if (name === ParticipantProperties.PPROP_CONTENTS) {
          if (participant.getId() !== local.id) {
            contentLog(`Jitsi: content of ${participant.getId()} is updated.`)
            const contentsAsArray = addPerceptibility(JSON.parse(value))
            contentDebug(' updated to ', contentsAsArray)
            sharedContents.replaceRemoteContents(participant.getId(), contentsAsArray)
          }
        }else if (name === ParticipantProperties.PPROP_CONTENTS_UPDATE) {
          const local = ParticiantsStore.local.get()
          contentLog(`Jitsi: update request of ${participant.getId()} is updated.`)
          if (participant.getId() !== local.id) {
            const update = addPerceptibility(JSON.parse(value))
            contentDebug(' update by ', update)
            sharedContents.updateContents(update)
          }
        }else if (name === ParticipantProperties.PPROP_CONTENTS_REMOVE) {
          const local = ParticiantsStore.local.get()
          if (participant.getId() !== local.id) {
            contentLog(`Jitsi: remove request of ${participant.getId()} is updated.`)
            const removes = JSON.parse(value) as string[]
            sharedContents.removeContents(local.id, removes)
          }
        }
      },
    )

    conference.on(JitsiMeetJS.events.conference.TRACK_AUDIO_LEVEL_CHANGED, (id:string, level:number) => {
      console.debug(`Audio level of ${id} changed to ${level}.`)
      let participant = participantsStore.find(id)
      if (!participant) {
        participant = participantsStore.local.get()
      }
      if (! (participant === participantsStore.local.get() && participant.plugins.streamControl.muteAudio)) {
        participant?.tracks.setAudioLevel(level)
      }else {
        participant?.tracks.setAudioLevel(0)
      }
    })
  }

  //  Register event handeler for Conference (not JitsiConference, routed by above) events.
  private registerEventHandlers() {
    // Conference events
    this.on(
      ConferenceEvents.CONFERENCE_JOINED,
      this.onConferenceJoined.bind(this),
    )
    this.on(
      ConferenceEvents.LOCAL_PARTICIPANT_JOINED,
      this.onLocalParticipantJoined.bind(this),
    )
    this.on(
      ConferenceEvents.REMOTE_PARTICIPANT_JOINED,
      this.onRemoteParticipantJoined.bind(this),
    )
    this.on(
      ConferenceEvents.PARTICIPANT_LEFT,
      this.onParticipantLeft.bind(this),
    )
    this.on(
      ConferenceEvents.LOCAL_TRACK_ADDED,
      this.onLocalTrackAdded.bind(this),
    )
    this.on(
      ConferenceEvents.LOCAL_TRACK_REMOVED,
      this.onLocalTrackRemoved.bind(this),
    )
    this.on(
      ConferenceEvents.REMOTE_TRACK_ADDED,
      this.onRemoteTrackAdded.bind(this),
    )
    this.on(
      ConferenceEvents.REMOTE_TRACK_REMOVED,
      this.onRemoteTrackRemoved.bind(this),
    )
  }

  private onConferenceJoined() {
    connLog('Party: Joined conference room.')
  }
  private onLocalParticipantJoined() {
    if (!this._isForTest) {
      connLog('Party: Local Participant Joined.')
      this.localId = this._jitsiConference!.myUserId()
      const local = new LocalParticipant(this.localId)

      ParticiantsStore.local.set(local)

      this.bindStore(local)


      JitsiMeetJS.createLocalTracks({devices: ['audio', 'video'], constraints: config.rtc.videoConstraints}).then(
        (tracks: JitsiTrack[]) => {
          tracks.forEach((track) => {
            const did_ = track.getTrack().getSettings().deviceId
            const did:string = did_ ? did_ : ''
            if (track.getType() === 'audio') {
              ParticiantsStore.local.get().devicePreference.audioInputDevice = did
            }else if (track.getType() === 'video') {
              // console.log('Video track created:', JSON.stringify(track))
              ParticiantsStore.local.get().devicePreference.videoInputDevice = did
            }
          })
          this.addTracks(tracks as JitsiLocalTrack[])
          ParticiantsStore.local.get().devicePreference.audioOutputDevice
           = JitsiMeetJS.mediaDevices.getAudioOutputDevice()
        },
      ). catch((reason:JitisTrackError) => {
        console.warn(`${reason.name}:${reason.message}. Retry getUserMedia() without constraint`)
        if (reason.name !== 'gum.permission_denied') {
          JitsiMeetJS.createLocalTracks({devices: ['audio', 'video']}).then(
            (tracks: JitsiTrack[]) => {
              tracks.forEach((track) => {
                const did_ = track.getTrack().getSettings().deviceId
                const did:string = did_ ? did_ : ''
                if (track.getType() === 'audio') {
                  ParticiantsStore.local.get().devicePreference.audioInputDevice = did
                }else if (track.getType() === 'video') {
                  // console.log('Video track created:', JSON.stringify(track))
                  ParticiantsStore.local.get().devicePreference.videoInputDevice = did
                }
              })
              this.addTracks(tracks as JitsiLocalTrack[])
              ParticiantsStore.local.get().devicePreference.audioOutputDevice
              = JitsiMeetJS.mediaDevices.getAudioOutputDevice()
            },
          ). catch((reason:JitisTrackError) => {
            console.warn(`getUserMedia() failed again: ${reason.name}:${reason.message}`)
          })
        }
      })
    }
  }

  private onRemoteParticipantJoined(id: string, participant: {jitsiInstance: JitsiParticipant, isLocal: false}) {
    if (this._isForTest) {
      return
    }
    // this.participants.set(id, participant)
    ParticiantsStore.join(id)
  }

  private onParticipantLeft(id: string) {
    // this.participants.delete(id)
    ParticiantsStore.leave(id)
    sharedContents.onParticipantLeft(id)
  }

  private onRemoteTrackAdded(track: JitsiRemoteTrack) {
    if (this._isForTest) {
      return
    }

    const pid = track.getParticipantId()
    if (track.isMainScreen && track.isMainScreen()) {
      //  console.log(`${track} videoType:${(track as any).videoType} added`)
      track.getTrack().onmute = () => { sharedContents.mutedRemoteTracks.add(track) }
      track.getTrack().onunmute = () => { sharedContents.mutedRemoteTracks.delete(track) }
      const tracks:Set<JitsiTrack> = new Set(sharedContents.remoteMainTracks.get(pid))
      tracks.add(track)
      sharedContents.remoteMainTracks.set(pid, tracks)
    }else if (track.getContentId && track.getContentId()) {
      //  todo
    }else { //  remote mic and camera
      const remote = ParticiantsStore.remote.get(track.getParticipantId())
      if (remote) {
        if (track.isAudioTrack()) {
          remote.tracks.audio = track
        } else {
          remote.tracks.avatar = track
          track.getTrack().onended = () => {
            trackLog('avatar track ${track} ended.')
            remote.tracks.avatar = undefined
          }
          track.getTrack().onmute = () => { remote.tracks.onMuteChanged(track, true) }
          track.getTrack().onunmute = () => { remote.tracks.onMuteChanged(track, false) }
        }
      }
    }
  }
  private onRemoteTrackRemoved(track: JitsiLocalTrack) {
    const pid = track.getParticipantId()
    if (track.isMainScreen && track.isMainScreen()) {
      const tracks:Set<JitsiTrack> = new Set(sharedContents.remoteMainTracks.get(pid))
      tracks.delete(track)
      if (tracks.size) {
        sharedContents.remoteMainTracks.set(pid, tracks)
      }else {
        sharedContents.remoteMainTracks.delete(pid)
      }
    }else if (track.getContentId && track.getContentId()) {
      //  TODO
    }else { //  mic and camera
      const remote = ParticiantsStore.remote.get(track.getParticipantId())
      if (remote) {
        if (track.isAudioTrack()) {
          remote.tracks.audio = undefined
        } else {
          remote.tracks.avatar = undefined
        }
      }
    }
  }

  private onLocalTrackAdded(track: JitsiLocalTrack) {
    if (this._isForTest) {
      return
    }
    const local = ParticiantsStore.local.get()
    if (track.isMainScreen && track.isMainScreen()) {
      sharedContents.localMainTracks.add(track)
    }else if (track.getContentId && track.getContentId()) {
      // TODO add contents
      // sharedContents.localContentTracks.set(track.getUsageLabel(), track)
    }else { //  mic and camera
      if (track.isAudioTrack()) {
        local.tracks.audio = track
      } else {
        local.tracks.avatar = track
      }
    }
  }
  private onLocalTrackRemoved(track: JitsiLocalTrack) {
    const local = ParticiantsStore.local.get()
    if (track.isMainScreen && track.isMainScreen()) {
      sharedContents.localMainTracks.delete(track)
    }else if (track.getContentId && track.getContentId()) {
      //  TODO: delete to contents from tracks
    }else { //  mic and camera
      if (track.isAudioTrack()) {
        local.tracks.audio = undefined
      } else {
        local.tracks.avatar = undefined
      }
    }
  }
  public getLocalTracks(track?: TMediaType):JitsiLocalTrack[] {
    return this._jitsiConference ? this._jitsiConference.getLocalTracks(track) : []
  }
  public getLocalVideoTrack(): JitsiLocalTrack | null {
    return this._jitsiConference ? this._jitsiConference.getLocalVideoTrack() : null
  }
  public replaceTrack(oldTrack: JitsiLocalTrack, newTrack: JitsiLocalTrack) {
    this._jitsiConference?.replaceTrack(oldTrack, newTrack)
  }
  public removeTrack(track: JitsiLocalTrack) {
    this._jitsiConference?.removeTrack(track)
  }
  public addTracks(tracks: JitsiLocalTrack[]) {
    if (this._jitsiConference) {
      for (const track of tracks) {
        track.conference = this._jitsiConference
        if (track !== tracks[tracks.length - 1]) {
          this._jitsiConference.addTrack(track)
        }else {
          this._jitsiConference.addTrack(track).then(() => {
            //  this._loggerHandler?.log('JitsiLocalTracks have been added.', 'Party')
            const locals = this._jitsiConference?.getLocalTracks()
            if (locals) {
              if (TRACKLOG) {
                console.groupCollapsed(`addTracks([${tracks.length}]) called for ${tracks.map(t => t.rtcId)}`)
                for (const t of locals) {
                  console.log(`${t} rtcid:${t.rtcId} msid:${t.getOriginalStream().id}`)
                }
                console.groupEnd()
              }
            }
          })
        }
      }
    }
  }
}
