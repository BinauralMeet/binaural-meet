// import a global variant $ for lib-jitsi-meet
import {Pose2DMap} from '@models/MapObject'
import {Information} from '@models/Participant'
import {SharedContent as ISharedContent} from '@models/SharedContent'
import {ConnectionInfo, default as ConnectionInfoStore} from '@stores/ConnectionInfo'
import {LocalParticipant} from '@stores/participants/LocalParticipant'
import {default as ParticiantsStore} from '@stores/participants/Participants'
import {SharedContent as SharedContentStore} from '@stores/sharedContents/SharedContent'
import {default as sharedContents} from '@stores/sharedContents/SharedContents'
import {dummyConnectionStore} from '@test-utils/DummyParticipants'
import {EventEmitter} from 'events'
import jquery from 'jquery'
import JitsiMeetJS, {JitsiValues} from 'lib-jitsi-meet'
import JitsiParticipant from 'lib-jitsi-meet/JitsiParticipant'
import JitsiLocalTrack from 'lib-jitsi-meet/modules/RTC/JitsiLocalTrack'
import JitsiRemoteTrack from 'lib-jitsi-meet/modules/RTC/JitsiRemoteTrack'
import JitsiTrack, {JitsiTrackEvents} from 'lib-jitsi-meet/modules/RTC/JitsiTrack'
import * as TPC from 'lib-jitsi-meet/modules/RTC/TPCUtils'
import {autorun, reaction} from 'mobx'
import {throttle} from 'throttle-debounce'
import {Store} from '../../stores/utils'
import {ConnectionStates, ConnectionStatesType} from './Constants'
import ApiLogger, {ILoggerHandler} from './Logger'

//  Log level and module log options
const JITSILOGLEVEL = 'warn'  // log level for lib-jitsi-meet {debug|log|warn|error}
const TRACKLOG = true         // show add, remove... of tracks
if (TPC.setTPCLogger !== undefined) {
  //  TPC.setTPCLogger(TRACKLOG ? console.log : (a:any) => {})
}
const trackLog = TRACKLOG ? console.log : (a:any) => {}

// config.js
declare const config:any                  //  from ../../config.js included from index.html

declare var global: any
global.$ = jquery
global.jQuery = jquery

console.log(`JitsiMeetJS Version: ${JitsiMeetJS.version}`)

const initOptions: JitsiMeetJS.IJitsiMeetJSOptions = {
  useIPv6: false,
  disableSimulcast: false,
  enableWindowOnErrorHandler: false,
  enableAnalyticsLogging: false,
  disableThiredPartyRequests: false,
  disableAudioLevels: true,

  // The ID of the jidesha extension for Chrome.
  desktopSharingChromeExtId: 'mbocklcggfhnbahlnepmldehdhpjfcjp',

  // Whether desktop sharing should be disabled on Chrome.
  desktopSharingChromeDisabled: false,

  // The media sources to use when using screen sharing with the Chrome
  // extension.
  desktopSharingChromeSources: ['screen', 'window'],

  // Required version of Chrome extension
  desktopSharingChromeMinExtVersion: '0.1',

  // Whether desktop sharing should be disabled on Firefox.
  desktopSharingFirefoxDisabled: true,
}

const ConnectionEvents = {
  CONNECTION_ESTABLISHED: 'connection_established',
  CONNECTION_DISCONNECTED: 'connection_disconnected',
  CONNECTION_CONNECTING: 'connection_connecting',
}

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
  PPROP_CONTENTS: 'contents',
  PPROP_CONTENTS_UPDATE: 'contents_update',
  PPROP_CONTENTS_REMOVE: 'contents_remove',
  PPROP_INFO: 'info',
}

class Connection extends EventEmitter {

  private _jitsiConnection?: JitsiMeetJS.JitsiConnection
  private _jitsiConference?: JitsiMeetJS.JitsiConference
  private _loggerHandler: ILoggerHandler | undefined
  private _store: Store<ConnectionInfo> | undefined
  private _isForTest: boolean
  public state: ConnectionStatesType
  public version: string
  public participants: Map<string, { jitsiInstance?: JitsiParticipant, isLocal: boolean}>
  public localId: string
//  public localTracks: JitsiLocalTrack[] = []
  public get conference(): JitsiMeetJS.JitsiConference|undefined {
    return this._jitsiConference
  }
  // public remotes: JitsiParticipant[]


  constructor(connectionName = 'PartyConnection', isForTest = false) {
    super()

    this.state = ConnectionStates.DISCONNECTED
    this.version = '0.0.1'
    this.localId = ''
    // this.remotes = []
    this.participants = new Map<string, { jitsiInstance: JitsiParticipant, isLocal: boolean}>()

    this._loggerHandler = ApiLogger.setHandler(connectionName)
    this._isForTest = isForTest
  }

  public set Store(store: Store<ConnectionInfo>) {
    this._store = store
  }

  public init(): Promise<string> {
    this._loggerHandler?.log('Start initialization.', 'Party')
    this.registerEventHandlers()

    return this.initJitsiConnection()
  }

  public joinConference(conferenceName: string) {
    if (this._jitsiConnection) {
      this.initJitsiConference(conferenceName)

      return
    }
    throw new Error('No connection has been established.')
  }

  public sendSharedContents(cs: ISharedContent[]) {
    this._jitsiConference?.setLocalParticipantProperty(ParticipantProperties.PPROP_CONTENTS, JSON.stringify(cs))
  }
  public sendSharedContentsUpdateRequest(cs: ISharedContent[]) {
    this._jitsiConference?.setLocalParticipantProperty(ParticipantProperties.PPROP_CONTENTS_UPDATE, JSON.stringify(cs))
  }
  public sendSharedContentsRemoveRequest(ids: string[]) {
    this._jitsiConference?.setLocalParticipantProperty(ParticipantProperties.PPROP_CONTENTS_REMOVE, JSON.stringify(ids))
  }
  public getSharedContents(pid: string): ISharedContent[] {
    const participant = this._jitsiConference?.getParticipantById(pid)
    if (participant) {
      const str = participant.getProperty(ParticipantProperties.PPROP_CONTENTS)
      if (str && str.length > 0) {

        return JSON.parse(str)
      }
    }

    return []
  }
  public sendCommand(name: string, values: JitsiValues) {
    if (this._jitsiConference) {
      this._jitsiConference.sendCommand(name, values)
    }
  }

  private sendLocalParticipantInformationDisposer = autorun(
    () => {
      const info = {...ParticiantsStore.local.get().information}
      this._jitsiConference?.setLocalParticipantProperty(ParticipantProperties.PPROP_INFO, JSON.stringify(info))
      //  console.log('LocalParticipantInfo sent.', info)
    })

  private bindStore(local: LocalParticipant) {
    const localParticipantId = local.id
    // const localParticipant = this.participants.get(localParticipantId)

    // this._jitsiConference?.setLocalParticipantProperty('pose', {children: local.pose})
    // localParticipant?.jitsiInstance?.setProperty(
    //   'pose',
    //   local.pose,
    // )
    this._loggerHandler?.debug('Initialize local pose.', 'bindStore')

    const UPDATE_INTERVAL = 200
    const throttledUpdateFunc = throttle(UPDATE_INTERVAL, (newPose: Pose2DMap) => {
      this._jitsiConference?.setLocalParticipantProperty(ParticipantProperties.PPROP_POSE, JSON.stringify(newPose))
    })

    const disposer = autorun(   // FIXME disposer not used
      () => {
        const newPose = {
          position: local.pose.position,
          orientation: local.pose.orientation,
        }
        throttledUpdateFunc(newPose)
      },
    )
    // const disposer = local.observe(
    //   throttle(200, (change) => {
    //     this._loggerHandler?.debug('Update local pose.', 'bindStore')
    //     console.log(change.oldValue, '->', change.newValue)
    //     this.participants
    //       .get(localParticipantId)?.jitsiInstance?.setProperty('pose', change.newValue.pose)
    //   }),
    // )
  }
  private registerEventHandlers() {

    // Connection events
    this.on(
      ConnectionEvents.CONNECTION_ESTABLISHED,
      this.onConnectionStateChanged.bind(this),
    )
    this.on(
      ConnectionEvents.CONNECTION_CONNECTING,
      this.onConnectionStateChanged.bind(this),
    )
    this.on(
      ConnectionEvents.CONNECTION_DISCONNECTED,
      this.onConnectionStateChanged.bind(this),
    )

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


  private initJitsiConnection(): Promise<string> {
    return new Promise<string>(
      (resolve, reject) => {
        JitsiMeetJS.init(initOptions)
        JitsiMeetJS.setLogLevel(JITSILOGLEVEL)

        this._jitsiConnection = new JitsiMeetJS.JitsiConnection(
          null as unknown as string, undefined as unknown as string, config)

        /*    I don't have to add Origin header. Browser will add it.
            //  add Origin header
            let opt = this._jitsiConnection.xmpp.connection.options;
            opt['customHeaders'] = {Origin: 'https://localhost:9000'} */

        this._jitsiConnection.addEventListener(
          JitsiMeetJS.events.connection.CONNECTION_ESTABLISHED,
          () => {
            this._loggerHandler?.debug('Connection has been established.', 'Jitsi')
            this.emit(
              ConnectionEvents.CONNECTION_ESTABLISHED,
              ConnectionStates.CONNECTED,
            )
            resolve(ConnectionStates.CONNECTED)
          },
        )
        this._jitsiConnection.addEventListener(
          JitsiMeetJS.events.connection.CONNECTION_FAILED,
          () => {
            this._loggerHandler?.debug('Failed to connect.', 'Jitsi')
            reject(ConnectionStates.DISCONNECTED)
          },
        )
        this._jitsiConnection.addEventListener(
          JitsiMeetJS.events.connection.CONNECTION_DISCONNECTED,
          () => {
            this._loggerHandler?.debug('Disconnected from remote server.', 'Jitsi')
            this.emit(
              ConnectionEvents.CONNECTION_DISCONNECTED,
              ConnectionStates.DISCONNECTED,
            )
          },
        )

        this._jitsiConnection.connect()
        this.emit(
          ConnectionEvents.CONNECTION_CONNECTING,
          ConnectionStates.CONNECTING,
        )
      },
    )
  }

  public disconnect(): Promise<any> {
    if (this._jitsiConnection) {
      this._loggerHandler?.log('Disconnection order has been sent.', 'Party')

      return this._jitsiConnection?.disconnect()
    }

    return Promise.reject('No connection has been established.')
  }

  /**
   * reduce bit rate
   * peerconnection as TraceablePeerConnection
   * peerconnection.peerconnection as RTCPeerConnection */
  reduceBitrate() {
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
        this._loggerHandler?.log('Joined a conference room.', logField)
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
        this._loggerHandler?.log(`New participant[${id}] joined.`, logField)
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
        this._loggerHandler?.log('A participant left.', logField)
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
        trackLog(`TRACK_ADDED: ${track} type:${track.getType()} ${track.getUsageLabel()} tid:${track.getId()} msid:${track.getOriginalStream().id}`)

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
        if (remoteTrack.isVideoTrack() && !remoteTrack.isScreenSharing()) {
          target.plugins.streamControl.muteVideo = remoteTrack.isMuted()
        }
      },
    )

    conference.on(
      JitsiMeetJS.events.conference.PARTICIPANT_PROPERTY_CHANGED,
      (participant: JitsiParticipant, name: string, oldValue: string, value: string) => {
        this._loggerHandler?.debug('Participant property has changed.', 'Jitsi')

        // Change store
        if (name === ParticipantProperties.PPROP_POSE) {
          const pose: Pose2DMap = JSON.parse(value)
          const id = participant.getId()
          const target = ParticiantsStore.find(id)

          target.pose.orientation = pose.orientation
          target.pose.position = pose.position
        }else if (name === ParticipantProperties.PPROP_INFO) {
          const id = participant.getId()
          const target = ParticiantsStore.find(id)
          const info: Information = JSON.parse(value)
          Object.assign(target.information, info)
        }else if (name === ParticipantProperties.PPROP_CONTENTS) {
          const local = ParticiantsStore.local.get()
          if (participant.getId() !== local.id) {
            console.log('Jitsi: content of ', participant.getId(), ' is updated to ', value)
            const contentsAsArray = JSON.parse(value)
            console.log(contentsAsArray)
            sharedContents.replaceRemoteContents(participant.getId(), contentsAsArray)
          }
        }else if (name === ParticipantProperties.PPROP_CONTENTS_UPDATE) {
          const local = ParticiantsStore.local.get()
          if (participant.getId() !== local.id) {
            console.log('Jitsi: update request of ', participant.getId(), ' is updated to:', value)
            const update = JSON.parse(value) as SharedContentStore[]
            sharedContents.updateContents(update)
          }
        }else if (name === ParticipantProperties.PPROP_CONTENTS_REMOVE) {
          const local = ParticiantsStore.local.get()
          if (participant.getId() !== local.id) {
            console.log('Jitsi: remove request of ', participant.getId(), ' is updated to:', value)
            const removes = JSON.parse(value) as string[]
            sharedContents.removeContents(local.id, removes)
          }
        }
      },
    )
  }

  private initJitsiConference(name: string) {
    if (this._jitsiConnection) {
      this._jitsiConference = this._jitsiConnection.initJitsiConference(name, config)
      this.registerJistiConferenceEvents(this._jitsiConference)
      this._jitsiConference.join('')
    }
  }

  private setLocalParticipant() {
    if (this._jitsiConference) {
      this.localId = this._jitsiConference?.myUserId()

      const local = this.participants.get(this.localId)
      if (local) {
        local.isLocal = true
      } else {
        this.participants.set(
          this.localId,
          {
            isLocal: true,
          },
        )
      }

      // if (this.participants.size > 0) {

      //   const local = this.participants.get(this.localId)
      //   if (local) {
      //     local.isLocal = true
      //   }
      // } else {
      //   this.participants.set(
      //     this.localId,
      //     {jitsiInstance: jitsiLocal, isLocal: true},
      //   )
      // }
    }
  }

  private onRemoteParticipantJoined(id: string, participant: {jitsiInstance: JitsiParticipant, isLocal: false}) {
    if (this._isForTest) {
      return
    }
    this.participants.set(id, participant)
    ParticiantsStore.join(id)
  }

  private onConnectionStateChanged(state: ConnectionStatesType) {
    this.state = state
    this._loggerHandler?.debug(`Current Connection State: ${state}`, 'ConnctionStateChanged')

    if (this._store) {
      this._store.changeState(this.state)
    }
  }

  public createJitisLocalTracksFromStream(stream: MediaStream): Promise<JitsiLocalTrack[]> {
    const videoTrack: MediaStreamTrack = stream.getVideoTracks()[0]
    const audioTrack: MediaStreamTrack = stream.getAudioTracks()[0]
    const videoStream: MediaStream = new MediaStream([videoTrack])
    let audioStream: MediaStream
    let audioTrackInfo: JitsiMeetJS.TrackInfo | undefined = undefined

    if (audioTrack) {
      audioStream = new MediaStream([audioTrack])
      audioTrackInfo = {
        videoType: null,
        mediaType: 'audio',
        rtcId: 0,
        stream: audioStream,
        track: audioTrack,
        effects: undefined,
        resolution: audioTrack.getSettings().height,
        deviceId: 'videofile_chrome',
        facingMode: 'environment',
      }
    }

    const videoTrackInfo: JitsiMeetJS.TrackInfo = {
      videoType: 'camera',
      mediaType: 'video',
      rtcId: 1,
      stream: videoStream,
      track: videoTrack,
      effects: undefined,
      resolution: videoTrack.getSettings().height,
      deviceId: 'videofile_chrome',
      facingMode: 'environment',
    }


    return audioTrackInfo ?
    Promise.resolve([
      new JitsiLocalTrack(videoTrackInfo),
      new JitsiLocalTrack(audioTrackInfo),
    ]) :
    Promise.resolve([new JitsiLocalTrack(videoTrackInfo)])
  }
  public addTracks(tracks: JitsiLocalTrack[]) {
    if (this._jitsiConference) {
      for (const track of tracks) {
        if (track !== tracks[tracks.length - 1]) {
          this._jitsiConference.addTrack(track)
        }else {
          this._jitsiConference.addTrack(track).then(() => {
            //  this._loggerHandler?.log('JitsiLocalTracks have been added.', 'Party')
            const locals = connection.conference?.getLocalTracks()
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

  private onConferenceJoined() {
    this._loggerHandler?.log('Joined conference room.', 'Party')
  }
  private onLocalParticipantJoined() {
    this.setLocalParticipant()

    if (!this._isForTest) {
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
      ). catch(() => { console.log('Device enumeration error') })
    }
  }

  private onParticipantLeft(id: string) {
    this.participants.delete(id)
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
}

const connection = new Connection('PartyConnection')
connection.Store = ConnectionInfoStore
// const dummyConnection = new Connection('DummyConnection')
// dummyConnection.Store = dummyConnectionStore

export {Connection, connection}
//  , dummyConnection}

