import {ConnectionInfo, default as ConnectionInfoStore} from '@stores/ConnectionInfo'
import {default as ParticiantsStore} from '@stores/Participants'
import {EventEmitter} from 'events'
import JitsiMeetJS from 'lib-jitsi-meet'
import JitsiTrack from 'lib-jitsi-meet/modules/RTC/JitsiTrack'
import {Store} from '../../stores/utils'
import {ConnectionStates} from './Constants'
import ApiLogger, {ILoggerHandler} from './Logger'
import {config} from './test.config'
// import _ from 'lodash'

// import a global variant $ for lib-jitsi-meet
import {DummyConnectionStore, dummyConnectionStore} from '@test-utils/DummyParticipants'
import jquery from 'jquery'
import JitsiParticipant from 'lib-jitsi-meet/JitsiParticipant'
// import JitsiTrack from 'lib-jitsi-meet/modules/RTC/JitsiTrack'
import JitsiLocalTrack from 'lib-jitsi-meet/modules/RTC/JitsiLocalTrack'
import JitsiRemoteTrack from 'lib-jitsi-meet/modules/RTC/JitsiRemoteTrack'
import { Participant } from '@stores/Participant'

declare var global: any
global.$ = jquery
global.jQuery = jquery

const JitsiEvents = JitsiMeetJS.events
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
}

class Connection extends EventEmitter {

  private _jitsiConnection?: JitsiMeetJS.JitsiConnection
  private _jitsiConference?: JitsiMeetJS.JitsiConference
  private _loggerHandler: ILoggerHandler | undefined
  private _store: Store<ConnectionInfo>
  private _isForTest: boolean
  public state: ConnectionStates
  public version: string
  public participants: Map<string, { jitsiInstance?: JitsiParticipant, isLocal: boolean}>
  public localId: string

  // public remotes: JitsiParticipant[]


  constructor(store: Store<ConnectionInfo>, handlerName = 'PartyConnection') {
    super()

    this.state = ConnectionStates.Disconnected
    this.version = '0.0.1'
    this.localId = ''
    // this.remotes = []
    this.participants = new Map<string, { jitsiInstance: JitsiParticipant, isLocal: boolean}>()

    this._loggerHandler = ApiLogger.setHandler(handlerName)
    this._store = store
    this._isForTest = (handlerName === 'DummyConnection')
  }

  public init(): Promise<string> {
    this._loggerHandler?.log('(Party) Start initialization.')
    this.registerEventHandlers()

    return this.initJitsiConnection().then(
      () => {
        this.initJitsiConference()

        return Promise.resolve('Successed.')
      },
    )
  }

  private registerEventHandlers() {
    this.on(
      ConnectionEvents.CONNECTION_ESTABLISHED,
      this.onConnectionEstablished.bind(this),
    )

    this.on(
      ConnectionEvents.CONNECTION_CONNECTING,
      this.onConnectionConnecting.bind(this),
    )

    this.on(
      ConnectionEvents.CONNECTION_DISCONNECTED,
      this.onConnectionDisposed.bind(this),
    )
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
      ConferenceEvents.LOCAL_TRACK_ADDED,
      this.onLocalTrackAdded.bind(this),
    )
    this.on(
      ConferenceEvents.REMOTE_TRACK_ADDED,
      this.onRemoteTrackAdded.bind(this),
    )
  }


  private initJitsiConnection(): Promise<void> {
    return new Promise(
      (resolve, reject) => {
        JitsiMeetJS.init(initOptions)

        this._jitsiConnection = new JitsiMeetJS.JitsiConnection('test', '', config)

        this._jitsiConnection.addEventListener(
          JitsiMeetJS.events.connection.CONNECTION_ESTABLISHED,
          () => {
            this._loggerHandler?.log('(Jitsi) Connection has been established.')
            this.emit(ConnectionEvents.CONNECTION_ESTABLISHED)
            resolve()
          },
        )
        this._jitsiConnection.addEventListener(
          JitsiMeetJS.events.connection.CONNECTION_FAILED,
          () => {
            this._loggerHandler?.log('(Jitsi) Failed to connect.')
            reject()
          },
        )
        this._jitsiConnection.addEventListener(
          JitsiMeetJS.events.connection.CONNECTION_DISCONNECTED,
          () => {
            this._loggerHandler?.log('(Jitsi) Disconnected from remote server.')
            this.emit(ConnectionEvents.CONNECTION_DISCONNECTED)
          },
        )

        this._jitsiConnection.connect()
        this.emit(ConnectionEvents.CONNECTION_CONNECTING)
      },
    )
  }

  public disconnect(): void {
    this._jitsiConnection?.disconnect()
    this._loggerHandler?.log('(Party) Disconnection order has been sent.')
  }

  private initJitsiConference() {
    this._jitsiConference = this._jitsiConnection?.initJitsiConference('conference1', {})

    // this._jitsiConference?.on(
    //   (JitsiMeetJS.events.conference.TRACK_ADDED),
    //   () => {
    //     this._loggerHandler?.log('(Jitsi) Added a track.')
    //   },
    // )
    this._jitsiConference?.on(
      JitsiMeetJS.events.conference.CONFERENCE_JOINED,
      () => {
        this._loggerHandler?.log('(Jitsi) Joined a conference room.')
        this.emit(ConferenceEvents.LOCAL_PARTICIPANT_JOINED)
      },
    )
    this._jitsiConference?.on(
      JitsiMeetJS.events.conference.USER_JOINED,
      (id: string, user: JitsiParticipant) => {
        this._loggerHandler?.log('(Jitsi) New participant joined.')
        this.emit(
          ConferenceEvents.REMOTE_PARTICIPANT_JOINED,
          id,
          { jitsiInstance: user, isLocal: false }
        )
      },
    )
    this._jitsiConference?.on(
      JitsiMeetJS.events.conference.USER_LEFT,
      (id: string, user: JitsiParticipant) => {
        this._loggerHandler?.log('(Jisti) A participant left.')
        this.participants.delete(id)
      },
    )
    this._jitsiConference?.on(
      JitsiMeetJS.events.conference.TRACK_ADDED,
      (track: JitsiTrack) => {
        this._loggerHandler?.log(`Added a ${track.isLocal() ? 'local' : 'remote'} track.`, 'Jitsi')

        if (track.isLocal()) {
          this.emit(
            ConferenceEvents.LOCAL_TRACK_ADDED,
            track as JitsiLocalTrack,
          )
        } else {
          this._loggerHandler?.log(`Remote participant ID: ${(<JitsiRemoteTrack>track).getParticipantId()}`)
          this.emit(
            ConferenceEvents.REMOTE_TRACK_ADDED,
            // TODO: Add JitsiRemoteTrack
            track as JitsiRemoteTrack,
          )
        }
      },
    )

    JitsiMeetJS.createLocalTracks({ devices: [ 'audio', 'video' ] }).then(
      (tracks: JitsiTrack[]) => {
        // Do something on local tracks.

        // Join room.
        this._jitsiConference?.join('')
        // console.info(tracks)
      },
    )
  }

  private setLocalParticipant() {
    if (this._jitsiConference) {
      this.localId = this._jitsiConference?.myUserId()

      if (this.participants.size > 0) {

        const local = this.participants.get(this.localId)
        if (local) {
          local.isLocal = true
        }
      } else {
        this.participants.set(
          this.localId,
          {isLocal: true},
        )
      }
    }
  }

  private onRemoteParticipantJoined(id: string, participant: {jitsiInstance: JitsiParticipant, isLocal: false}) {
    this.participants.set(id, participant)
    ParticiantsStore.join(id)
  }

  public joinConference(localTracks: JitsiLocalTrack[]) {
    this._loggerHandler?.log('Method[joinConference] called.')
    if (this._jitsiConference) {
      if (this._isForTest) {
        this.addTracks(localTracks)
      }

      this._jitsiConference.join('')
      this._loggerHandler?.log('(Party) Joining a conference room.')
    }
  }

  private onConnectionEstablished() {
    this.state = ConnectionStates.Connected
    this._loggerHandler?.log('(Party) Action[changeState] will be triggered.')
    this._store.changeState(this.state)
  }

  private onConnectionDisposed() {
    this.state = ConnectionStates.Disconnected
    this._loggerHandler?.log('(Party) Action[changeState] will be triggered.')
    this._store.changeState(this.state)
  }

  private onConnectionConnecting() {
    this.state = ConnectionStates.Connecting
    this._store.changeState(this.state)
  }

  public createJitisLocalTracksFromStream(stream: MediaStream): Promise<JitsiLocalTrack[]> {
    const videoTrack: MediaStreamTrack = stream.getVideoTracks()[0]
    const audioTrack: MediaStreamTrack = stream.getAudioTracks()[0]
    const videoStream: MediaStream = new MediaStream([videoTrack])
    const audioStream: MediaStream = new MediaStream([audioTrack])
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
    const audioTrackInfo: JitsiMeetJS.TrackInfo = {
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

    return Promise.resolve([
      new JitsiLocalTrack(videoTrackInfo),
      new JitsiLocalTrack(audioTrackInfo),
    ])
  }
  public addTracks(tracks: JitsiLocalTrack[]) {
    if (this._jitsiConference) {
      for (const track of tracks) {
        this._jitsiConference.addTrack(track)
      }

      this._loggerHandler?.log('(Party) JitsiLocalTracks have been added.')
    }
  }

  public onConferenceJoined() {

  }
  private onLocalParticipantJoined() {
    this.setLocalParticipant()
    ParticiantsStore.local.set(new Participant(this.localId))
  }

  private onRemoteTrackAdded(track: JitsiRemoteTrack) {
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
  return [f()]
}

const connection = new Connection(ConnectionInfoStore)
const dummyConnection = new Connection(dummyConnectionStore, 'DummyConnection')

export {Connection, connection, dummyConnection}

