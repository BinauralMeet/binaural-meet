import {ConnectionInfo, default as ConnectionInfoStore} from '@stores/ConnectionInfo'
import {default as ParticiantsStore} from '@stores/Participants'
import {EventEmitter} from 'events'
import JitsiMeetJS from 'lib-jitsi-meet'
import JitsiTrack from 'lib-jitsi-meet/modules/RTC/JitsiTrack'
import {Store} from '../../stores/utils'
import {ConnectionStates, ConnectionStatesType} from './Constants'
import ApiLogger, {ILoggerHandler} from './Logger'
import {config} from './test.config'
// import _ from 'lodash'

// import a global variant $ for lib-jitsi-meet
import {Pose2DMap} from '@models/Participant'
import {Participant} from '@stores/Participant'
import {DummyConnectionStore, dummyConnectionStore} from '@test-utils/DummyParticipants'
import jquery from 'jquery'
import JitsiParticipant from 'lib-jitsi-meet/JitsiParticipant'
// import JitsiTrack from 'lib-jitsi-meet/modules/RTC/JitsiTrack'
import JitsiLocalTrack from 'lib-jitsi-meet/modules/RTC/JitsiLocalTrack'
import JitsiRemoteTrack from 'lib-jitsi-meet/modules/RTC/JitsiRemoteTrack'
import {autorun, IObservableValue, observe} from 'mobx'
import {throttle} from 'throttle-debounce'

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
  PARTICIPANT_LEFT: 'participant_left',
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

  private bindStore(local: Participant) {
    const localParticipantId = local.id
    // const localParticipant = this.participants.get(localParticipantId)

    // this._jitsiConference?.setLocalParticipantProperty('pose', {children: local.pose})
    // localParticipant?.jitsiInstance?.setProperty(
    //   'pose',
    //   local.pose,
    // )
    this._loggerHandler?.debug('Initialize local pose.', 'bindStore')

    const throttledUpdateFunc = throttle(200, (newPose: Pose2DMap) => {
      this._jitsiConference?.setLocalParticipantProperty('pose', JSON.stringify(newPose))
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
      ConferenceEvents.REMOTE_TRACK_ADDED,
      this.onRemoteTrackAdded.bind(this),
    )
  }


  private initJitsiConnection(): Promise<string> {
    return new Promise<string>(
      (resolve, reject) => {
        JitsiMeetJS.init(initOptions)
        JitsiMeetJS.setLogLevel('warn')

        this._jitsiConnection = new JitsiMeetJS.JitsiConnection('Jitsi-Party', '', config)

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
        this._loggerHandler?.log('New participant joined.', logField)
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
        this._loggerHandler?.debug(`Added a ${track.isLocal() ? 'local' : 'remote'} track.`, logField)

        if (track.isLocal()) {
          this.emit(
            ConferenceEvents.LOCAL_TRACK_ADDED,
            track as JitsiLocalTrack,
          )
        } else {
          this._loggerHandler?.log(`Remote participant ID: ${(<JitsiRemoteTrack>track).getParticipantId()}`)
          this.emit(
            ConferenceEvents.REMOTE_TRACK_ADDED,
            track as JitsiRemoteTrack,
          )
        }
      },
    )

    conference.on(
      JitsiMeetJS.events.conference.PARTICIPANT_PROPERTY_CHANGED,
      (participant: JitsiParticipant, name: string, oldValue: string, value: string) => {
        this._loggerHandler?.debug('Participant property has changed.', 'Jitsi')

        // Change store
        if (name === 'pose') {
          const pose: Pose2DMap = JSON.parse(value)
          const id = participant.getId()
          const target = ParticiantsStore.find(id)

          target.pose.orientation = pose.orientation
          target.pose.position = pose.position
        }
      },
    )

  }

  private initJitsiConference(name: string) {
    if (this._jitsiConnection) {
      this._jitsiConference = this._jitsiConnection.initJitsiConference(name, {})
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

  // public joinConference(localTracks: JitsiLocalTrack[]) {
  //   if (this._jitsiConference) {
  //     if (this._isForTest) {
  //       this.addTracks(localTracks)
  //     }

  //     this._jitsiConference.join('')
  //     this._loggerHandler?.log('Joining a conference room.', 'Party')
  //   }
  // }

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
        this._jitsiConference.addTrack(track)
      }

      this._loggerHandler?.log('JitsiLocalTracks have been added.', 'Party')
    }
  }

  private onConferenceJoined() {
    this._loggerHandler?.log('Joined conference room.', 'Party')
  }
  private onLocalParticipantJoined() {
    this.setLocalParticipant()

    if (!this._isForTest) {
      const local = new Participant(this.localId)

      ParticiantsStore.local.set(local)

      this.bindStore(local)

      JitsiMeetJS.createLocalTracks({devices: ['audio', 'video']}).then(
        (tracks: JitsiTrack[]) => {
          this.addTracks(tracks as JitsiLocalTrack[])
          // Do something on local tracks.
          for (const track of tracks) {
            this.emit(
              ConferenceEvents.LOCAL_TRACK_ADDED,
              track,
            )
            this._loggerHandler?.log(`Add ${track.isAudioTrack() ? 'audio' : 'video'} localtrack.`, 'Track')
          }
        },
      )
    }
  }

  private onParticipantLeft(id: string) {
    this.participants.delete(id)
    ParticiantsStore.leave(id)
  }

  private onRemoteTrackAdded(track: JitsiRemoteTrack) {
    if (this._isForTest) {
      return
    }

    const remote = ParticiantsStore.remote.get(track.getParticipantId())
    const warppedT = toTracks(track.getTrack.bind(track))

    if (remote) {
      if (track.isAudioTrack()) {
        remote.stream.audioStream = new MediaStream(warppedT)
      } else if (track.isVideoTrack() && track.isScreenSharing()) {
        remote.stream.screenStream = new MediaStream(warppedT)
      } else {
        remote.stream.avatarStream = new MediaStream(warppedT)
      }
    }
  }

  private onLocalTrackAdded(track: JitsiLocalTrack) {
    if (this._isForTest) {
      return
    }
    const local = ParticiantsStore.local.get()
    const warppedT = toTracks(track.getTrack.bind(track))

    if (track.isAudioTrack()) {
      local.stream.audioStream = new MediaStream(warppedT)
    } else if (track.isVideoTrack() && track.isScreenSharing()) {
      local.stream.screenStream = new MediaStream(warppedT)
    } else {
      local.stream.avatarStream = new MediaStream(warppedT)
    }
  }
}

const toTracks = (f: () => MediaStreamTrack): MediaStreamTrack[] => {
  return [f().clone()]
}

const connection = new Connection('PartyConnection')
connection.Store = ConnectionInfoStore
const dummyConnection = new Connection('DummyConnection')
dummyConnection.Store = dummyConnectionStore

export {Connection, connection, dummyConnection}

