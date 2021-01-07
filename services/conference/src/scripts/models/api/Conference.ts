import {priorityCalculator} from '@models/middleware/trafficControl'
import {Information, Physics, TrackStates} from '@models/Participant'
import {participantsStore} from '@stores/participants'
import {LocalParticipant} from '@stores/participants/LocalParticipant'
import {default as ParticiantsStore} from '@stores/participants/Participants'
import sharedContents from '@stores/sharedContents/SharedContents'
import {EventEmitter} from 'events'
import JitsiMeetJS, {JitisTrackError, JitsiLocalTrack, JitsiRemoteTrack,
  JitsiTrack, JitsiValues, TMediaType} from 'lib-jitsi-meet'
import JitsiParticipant from 'lib-jitsi-meet/JitsiParticipant'
import {autorun} from 'mobx'
import {ConferenceSync} from './ConferenceSync'
import {connDebug, connLog, trackLog, TRACKLOG} from './Connection'

// config.js
declare const config:any             //  from ../../config.js included from index.html
declare const d:any                  //  from index.html

const CONF = JitsiMeetJS.events.conference
export const ConferenceEvents = {
  USER_JOINED: 'joined',
  USER_LEFT: 'left',
  REMOTE_TRACK_ADDED: 'remote_track_added',
  REMOTE_TRACK_REMOVED: 'remote_track_added',
}

export const ParticipantProperties = {
  PPROP_INFO: 'info',
  PPROP_PHYSICS: 'physics',
  PPROP_TRACK_LIMITS: 'trackLimits',
  PPROP_TRACK_STATES: 'trackStates',
}


export class Conference extends EventEmitter {
  public _jitsiConference?: JitsiMeetJS.JitsiConference
  public localId = ''
  sync = new ConferenceSync(this)

  public init(jc: JitsiMeetJS.JitsiConference) {
    this._jitsiConference = jc
    this.registerJistiConferenceEvents()
    this.sync.bind()
    this._jitsiConference.join('')
    this._jitsiConference.setSenderVideoConstraint(1080)

    //  To access from debug console, add object d to the window.
    d.conference = this
    d.jc = this._jitsiConference
  }

  //  Commmands for local tracks --------------------------------------------
  private localMicTrack?: JitsiLocalTrack
  private localCameraTrack?: JitsiLocalTrack
  public setLocalMicTrack(track: JitsiLocalTrack) {
    if (this.localMicTrack) {
      this._jitsiConference?.removeTrack(this.localMicTrack)
    }
    this.localMicTrack = track
    this.localMicTrack.videoType = 'mic'
    this._jitsiConference?.addTrack(this.localMicTrack)
  }
  public setLocalCameraTrack(track: JitsiLocalTrack) {
    if (this.localCameraTrack) {
      this._jitsiConference?.removeTrack(this.localCameraTrack)
    }
    this.localCameraTrack = track
    this.localCameraTrack.videoType = 'camera'
    this._jitsiConference?.addTrack(this.localCameraTrack)
  }
  public getLocalMicTrack() {
    return this.localMicTrack
  }
  public getLocalCameraTrack() {
    return this.localCameraTrack
  }

  //  Jitsi API Calls ----------------------------------------
  //  generic send command
  public sendCommand(name: string, values: JitsiValues) {
    this._jitsiConference?.sendCommand(name, values)
  }
  public removeCommand(name: string) {
    this._jitsiConference?.removeCommand(name)
  }
  public setLocalParticipantProperty(name: string, value:Object) {
    this._jitsiConference?.setLocalParticipantProperty(name, value)
  }
  public getLocalParticipantProperty(name: string): any {
    return this._jitsiConference?.getLocalParticipantProperty(name)
  }

  //
  public setSenderVideoConstraint(height: number) {
    this._jitsiConference?.setSenderVideoConstraint(height)
  }

  //  send Perceptibles API added by hasevr
  public setPerceptibles(perceptibles:[number[], number[]]) {
    if (this._jitsiConference?.setPerceptibles) {
      this._jitsiConference.setPerceptibles(perceptibles)
    }
  }


  //  Send local participant's property
  private sendLocalParticipantInformationDisposer = autorun(
    () => {
      const info = {...ParticiantsStore.local.information}
      this._jitsiConference?.setLocalParticipantProperty(ParticipantProperties.PPROP_INFO, JSON.stringify(info))
      //  console.log('LocalParticipantInfo sent.', info)
    },
  )
  //  Send local participant's property
  private sendLocalParticipantTrackStatesDisposer = autorun(
    () => {
      const trackStates = {...ParticiantsStore.local.trackStates}
      this._jitsiConference?.setLocalParticipantProperty(
        ParticipantProperties.PPROP_TRACK_STATES, JSON.stringify(trackStates))
      //  console.log('LocalParticipantInfo sent.', info)
    },
  )
  private sendLocalParticipantPhysicsDisposer = autorun(
    () => {
      const physics = {...ParticiantsStore.local.physics}
      this._jitsiConference?.setLocalParticipantProperty(ParticipantProperties.PPROP_PHYSICS, JSON.stringify(physics))
      //  console.log('LocalParticipantPhysics sent.', physics)
    },
  )
  //  send participant's pose
  private bindStore(local: LocalParticipant) {
    const UPDATE_INTERVAL = 200

/*    const throttledUpdatePose = throttle(UPDATE_INTERVAL, (newPose: Pose2DMap) => {
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
    const throttledUpdateMouse = throttle(UPDATE_INTERVAL, (mouse: Mouse) => {
      this._jitsiConference?.setLocalParticipantProperty(ParticipantProperties.PPROP_MOUSE, JSON.stringify(mouse))
    })
    const disposerMouse = autorun(
      () => {
        throttledUpdateMouse(Object.assign({}, local.mouse))
      },
    )*/
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

  sendMessage(type:string, to:string, value:any) {
    const msg = {type, value}
    const jc = this._jitsiConference as any
    this._jitsiConference?.sendMessage(msg, to, jc?.rtc?._channel?.isOpen() ? true : false)
  }

  //  register event handlers
  private registerJistiConferenceEvents() {
    if (!this._jitsiConference) {
      console.error('Dose not connected to conference yet.')

      return
    }
    this._jitsiConference.on(CONF.ENDPOINT_MESSAGE_RECEIVED, (participant:JitsiParticipant, msg:any) => {
      //  console.log(`ENDPOINT_MESSAGE_RECEIVED from ${participant.getId()}`, msg)
      if (msg.values) {
        this.emit(msg.type, participant.getId(), msg.values)
      }else {
        this.emit(msg.type, participant.getId(), msg.value)
      }
    })

    this._jitsiConference.on(CONF.CONFERENCE_JOINED, () => {
      connLog('Joined to a conference room.')
      this.onConferenceJoined()
    })
    this._jitsiConference.on(CONF.USER_JOINED, (id: string, user: JitsiParticipant) => {
      connLog(`New participant[${id}] joined.`)
      this.emit(ConferenceEvents.USER_JOINED, id, user)
    })
    this._jitsiConference.on(CONF.USER_LEFT, (id: string, user: JitsiParticipant) => {
      this.emit(ConferenceEvents.USER_LEFT, id, user)
      connLog('A participant left.')
    })
    this._jitsiConference.on(CONF.TRACK_ADDED, (track: JitsiTrack) => {
      trackLog(`TRACK_ADDED: ${track} type:${track.getType()} usage:${track.getUsageLabel()} tid:${track.getId()} msid:${track.getOriginalStream().id}`)
      if (track.isLocal()) {
        this.onLocalTrackAdded(track as JitsiLocalTrack)
      }else {
        this.emit(ConferenceEvents.REMOTE_TRACK_ADDED, track)
        this.onRemoteTrackAdded(track as JitsiRemoteTrack)
      }
    })

    this._jitsiConference.on(JitsiMeetJS.events.conference.TRACK_REMOVED, (track: JitsiTrack) => {
      trackLog(`TRACK_REMOVED: ${track} type:${track.getType()} ${track.getUsageLabel()} tid:${track.getId()} msid:${track.getOriginalStream().id}`)
      if (track.isLocal()) {
        this.onLocalTrackRemoved(track as JitsiLocalTrack)
      }else {
        this.emit(ConferenceEvents.REMOTE_TRACK_REMOVED, track)
        this.onRemoteTrackRemoved(track as JitsiRemoteTrack)
      }
    })
    this._jitsiConference.on(CONF.REMOTE_TRACK_VIDEOTYPE_CHANGING, (track: JitsiRemoteTrack, newType: string) => {
      this.onRemoteTrackRemoved(track)
    })
    this._jitsiConference.on(CONF.REMOTE_TRACK_VIDEOTYPE_CHANGED, (track: JitsiRemoteTrack, oldType: string) => {
      this.onRemoteTrackAdded(track)
    })
    this._jitsiConference.on(CONF.TRACK_MUTE_CHANGED, (track: JitsiTrack) => {
      trackLog(`TRACK_MUTE_CHANGED on ${track}.`)
      if (track.isLocal()) { return }
      const remoteTrack = track as JitsiRemoteTrack
      const target = ParticiantsStore.find(remoteTrack.getParticipantId())
      if (target && remoteTrack.isVideoTrack() && !remoteTrack.isScreenSharing()) {
        target.plugins.streamControl.muteVideo = remoteTrack.isMuted()
      }
    })
    this._jitsiConference.on(CONF.PARTICIPANT_PROPERTY_CHANGED, (participant: JitsiParticipant, name: string, oldValue: string, value: string) => {
      connDebug('Participant property has changed.')

      // Change store
      const local = ParticiantsStore.local
      if (name === ParticipantProperties.PPROP_INFO) {
        const id = participant.getId()
        if (id !== local.id) {
          const target = ParticiantsStore.find(id)
          const info: Information = JSON.parse(value)
          if (target) {
            Object.assign(target.information, info)
          }
        }
      }else if (name === ParticipantProperties.PPROP_TRACK_STATES) {
        const id = participant.getId()
        if (id !== local.id) {
          const target = ParticiantsStore.remote.get(id)
          const trackStates: TrackStates = JSON.parse(value)
          if (target) {
            Object.assign(target.trackStates, trackStates)
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
      }else if (name === ParticipantProperties.PPROP_TRACK_LIMITS) {
        const local = ParticiantsStore.local
        if (participant.getId() !== local.id) {
          const limits = JSON.parse(value) as string[]
          //  console.log(`PPROP_TRACK_LIMITS of ${limits} received.`)
          local.remoteVideoLimit = limits[0]
          local.remoteAudioLimit = limits[1]
        }
      }
    })

    this._jitsiConference.on(JitsiMeetJS.events.conference.TRACK_AUDIO_LEVEL_CHANGED, (id:string, level:number) => {
      //  console.debug(`Audio level of ${id} changed to ${level}.`)
      let participant = participantsStore.find(id)
      if (!participant) {
        participant = participantsStore.local
      }
      if (! (participant === participantsStore.local && participant.plugins.streamControl.muteAudio)) {
        participant?.tracks.setAudioLevel(level)
      }else {
        participant?.tracks.setAudioLevel(0)
      }
    })
  }

  private onConferenceJoined() {
    this.localId = this._jitsiConference!.myUserId()
    ParticiantsStore.setLocalId(this.localId)

    this.bindStore(ParticiantsStore.local)

    if (true) {  //  create mic then camera
      for (const type of ['audio', 'video']) {
        JitsiMeetJS.createLocalTracks({devices: [type], constraints: config.rtc.videoConstraints}).then(
          (tracks) => {
            tracks.forEach((track) => {
              const did = track.getTrack().getSettings().deviceId || ''
              if (track.getType() === 'audio') {
                this.setLocalMicTrack(track)
                ParticiantsStore.local.devicePreference.audioInputDevice = did
              }else if (track.getType() === 'video') {
                // console.log('Video track created:', JSON.stringify(track))
                this.setLocalCameraTrack(track)
                ParticiantsStore.local.devicePreference.videoInputDevice = did
              }
            })
            if (type === 'audio') {
              ParticiantsStore.local.devicePreference.audioOutputDevice
                = JitsiMeetJS.mediaDevices.getAudioOutputDevice()
            }
          },
        ).catch((reason:JitisTrackError) => {
          console.warn(`${reason.name}:${reason.message}. Retry getUserMedia() without constraint`)
          if (reason.name !== 'gum.permission_denied') {
            JitsiMeetJS.createLocalTracks({devices: [type]}).then(
              (tracks) => {
                tracks.forEach((track) => {
                  const did = track.getTrack().getSettings().deviceId || ''
                  if (track.getType() === 'audio') {
                    ParticiantsStore.local.devicePreference.audioInputDevice = did
                    this.setLocalMicTrack(track)
                  }else if (track.getType() === 'video') {
                    // console.log('Video track created:', JSON.stringify(track))
                    ParticiantsStore.local.devicePreference.videoInputDevice = did
                    this.setLocalCameraTrack(track)
                  }
                })
                ParticiantsStore.local.devicePreference.audioOutputDevice
                = JitsiMeetJS.mediaDevices.getAudioOutputDevice()
              },
            ). catch((reason:JitisTrackError) => {
              console.error(`${reason.name}:${reason.message}. getUserMedia() failed again`)
            })
          }
        })
      }
    } else {
      //  create mic and camera tracks
      JitsiMeetJS.createLocalTracks({devices: ['audio', 'video'], constraints: config.rtc.videoConstraints}).then(
        (tracks) => {
          tracks.forEach((track) => {
            const did = track.getTrack().getSettings().deviceId || ''
            if (track.getType() === 'audio') {
              this.setLocalMicTrack(track)
              ParticiantsStore.local.devicePreference.audioInputDevice = did
            }else if (track.getType() === 'video') {
              // console.log('Video track created:', JSON.stringify(track))
              this.setLocalCameraTrack(track)
              ParticiantsStore.local.devicePreference.videoInputDevice = did
            }
          })
          ParticiantsStore.local.devicePreference.audioOutputDevice
          = JitsiMeetJS.mediaDevices.getAudioOutputDevice()
        },
      ). catch((reason:JitisTrackError) => {
        console.warn(`${reason.name}:${reason.message}. Retry getUserMedia() without constraint`)
        if (reason.name !== 'gum.permission_denied') {
          JitsiMeetJS.createLocalTracks({devices: ['audio', 'video']}).then(
            (tracks) => {
              tracks.forEach((track) => {
                const did = track.getTrack().getSettings().deviceId || ''
                if (track.getType() === 'audio') {
                  ParticiantsStore.local.devicePreference.audioInputDevice = did
                  this.setLocalMicTrack(track)
                }else if (track.getType() === 'video') {
                  // console.log('Video track created:', JSON.stringify(track))
                  ParticiantsStore.local.devicePreference.videoInputDevice = did
                  this.setLocalCameraTrack(track)
                }
              })
              ParticiantsStore.local.devicePreference.audioOutputDevice
              = JitsiMeetJS.mediaDevices.getAudioOutputDevice()
            },
          ). catch((reason:JitisTrackError) => {
            console.error(`${reason.name}:${reason.message}. getUserMedia() failed again`)
          })
        }else {
          console.warn(`${reason.name}:${reason.message}. Retry getUserMedia() without video`)
          JitsiMeetJS.createLocalTracks({devices: ['audio']}).then(
            (tracks) => {
              tracks.forEach((track) => {
                const did = track.getTrack().getSettings().deviceId || ''
                if (track.getType() === 'audio') {
                  ParticiantsStore.local.devicePreference.audioInputDevice = did
                  this.setLocalMicTrack(track)
                }else if (track.getType() === 'video') {
                  // console.log('Video track created:', JSON.stringify(track))
                  ParticiantsStore.local.devicePreference.videoInputDevice = did
                  this.setLocalCameraTrack(track)
                }
              })
              ParticiantsStore.local.devicePreference.audioOutputDevice
              = JitsiMeetJS.mediaDevices.getAudioOutputDevice()
            },
          ).catch((reason:JitisTrackError) => {
            console.error(`getUserMedia() failed again: ${reason.name}:${reason.message}`)
          })
        }
      })
    }
  }

  private onRemoteTrackAdded(track: JitsiRemoteTrack) {
    //  update priorty for setPerceptible message.
    priorityCalculator.onRemoteTrackAdded(track)

    //  console.log(`onRemoteTrackAdded ${track} videoType:'${track.videoType ? track.videoType : undefined}'.`)
    if (track.isMainScreen()) {
      sharedContents.tracks.addRemoteMain(track)
    }else if (track.isScreenSharing()) {
      sharedContents.tracks.addRemoteContent(track)
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
  private onRemoteTrackRemoved(track: JitsiRemoteTrack) {
    if (track.isMainScreen()) {
      sharedContents.tracks.removeRemoteMain(track)
    }else if (track.isScreenSharing()) {
      sharedContents.tracks.removeRemoteContent(track)
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
    const local = ParticiantsStore.local
    if (!track.isScreenSharing()) { //  mic and camera
      if (track.isAudioTrack()) {
        if (local.plugins.streamControl.muteAudio) { track.mute() }
        else { track.unmute() }
        local.tracks.audio = track
      } else {
        local.tracks.avatar = track
        if (local.plugins.streamControl.muteVideo) { this.removeTrack(track) }
      }
    }
  }
  private onLocalTrackRemoved(track: JitsiLocalTrack) {
    const local = ParticiantsStore.local
    if (!track.isScreenSharing()) { //  mic and camera
      if (track.isAudioTrack()) {
        local.tracks.audio = undefined
      } else {
        local.tracks.avatar = undefined
      }
    }
  }
  public getLocalTracks(track ?: TMediaType):JitsiLocalTrack[] {
    return this._jitsiConference ? this._jitsiConference.getLocalTracks(track) : []
  }
  public getLocalVideoTrack(): JitsiLocalTrack | null {
    return this._jitsiConference ? this._jitsiConference.getLocalVideoTrack() : null
  }
  public replaceTrack(oldTrack: JitsiLocalTrack, newTrack: JitsiLocalTrack) {
    if (this._jitsiConference) {
      this._jitsiConference.replaceTrack(oldTrack, newTrack)
    }
  }
  public removeTrack(track: JitsiLocalTrack) {
    this._jitsiConference?.removeTrack(track)
  }
  public removeTracks(tracks: JitsiLocalTrack[]) {
    tracks.forEach(track =>  this._jitsiConference?.removeTrack(track))
  }
  public addTrack(track: JitsiLocalTrack) {
    this._jitsiConference?.addTrack(track)
  }
  public addTracks(tracks: JitsiLocalTrack[]) {
    for (const track of tracks) {
      if (track !== tracks[tracks.length - 1]) {
        this._jitsiConference?.addTrack(track)
      }else {
        this._jitsiConference?.addTrack(track).then(() => {
          if (TRACKLOG) {
            const locals = this._jitsiConference?.getLocalTracks()
            if (locals) {
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
