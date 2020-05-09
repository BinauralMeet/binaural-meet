import JitsiMeetJS from "@libs/lib-jitsi-meet";
import { EventEmitter } from "events";
import { config } from "./test.config";
import store from "@stores/ConnectionInfo";
import { ConnectionStates } from "./Constants";
import ApiLogger, { ILoggerHandler } from "./Logger";


// import a global variant $ for lib-jitsi-meet
import jquery from 'jquery';

declare var global: any;
global.$ = jquery;
global.jQuery = jquery;

const JitsiEvents = JitsiMeetJS.events;
console.log(`JitsiMeetJS Version: ${JitsiMeetJS.version}`);


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
    desktopSharingFirefoxDisabled: true
};

const ConnectionEvents = {
    CONNECTION_ESTABLISHED: 'connection_established',
    CONNECTION_DISCONNECTED: 'connection_disconnected',
}



class Connection extends EventEmitter {
    static createConnection(): Connection {
        return new Connection();
    }

    private _jitsiConnection?: JitsiMeetJS.JitsiConnection;
    private _jitsiConference?: JitsiMeetJS.JitsiConference;
    private _loggerHandler: ILoggerHandler | undefined;
    public state: ConnectionStates;
    public version: string;

    constructor() {
        super();

        this.state = ConnectionStates.Disconnected;
        this.version = '0.0.1';
        this._loggerHandler = ApiLogger.setHandler("Party-Conncetion");
    }

    public init(): Promise<string> {
        this._loggerHandler?.log("Start initialization.");
        this._registerEventHandlers();

        return this._initJitsiConnection().then(
            () => {
                this._initJitsiConference();
                return Promise.resolve("Successed.");
            }
        )
    }

    private _registerEventHandlers() {
        this.on(
            ConnectionEvents.CONNECTION_ESTABLISHED,
            this._onConnectionEstablished.bind(this)
        );

        this.on(
            ConnectionEvents.CONNECTION_DISCONNECTED,
            this._onConnectionDisposed.bind(this)
        )
    }


    private _initJitsiConnection(): Promise<void> {
        return new Promise(
            (resolve, reject) => {
                JitsiMeetJS.init(initOptions);

                this._jitsiConnection = new JitsiMeetJS.JitsiConnection("test", "", config);

                this._jitsiConnection.addEventListener(
                    JitsiEvents.connection.CONNECTION_ESTABLISHED,
                    () => {
                        this._loggerHandler?.log("Connection has been established.");
                        this.emit(ConnectionEvents.CONNECTION_ESTABLISHED);
                        resolve();
                    }
                );
                this._jitsiConnection.addEventListener(
                    JitsiEvents.connection.CONNECTION_FAILED,
                    () => {
                        this._loggerHandler?.log("Failed to connect.");
                        reject();
                    }
                );
                this._jitsiConnection.addEventListener(
                    JitsiEvents.connection.CONNECTION_DISCONNECTED,
                    () => {
                        this._loggerHandler?.log("Disconnected from remote server.");
                        this.emit(ConnectionEvents.CONNECTION_DISCONNECTED);
                    }
                );

                this._jitsiConnection.connect();
            }
        );
    }

    public disconnect(): void {
        this._jitsiConnection?.disconnect();
        this._loggerHandler?.log("Disconnection order has been sent.");
    }

    private _initJitsiConference() {
        this._jitsiConference = this._jitsiConnection?.initJitsiConference("conference1", {});

        this._jitsiConference?.on(
            (JitsiEvents.conference.TRACK_ADDED),
            () => {
                this._loggerHandler?.log("Joined a conference room.");
            }
        );
        this._jitsiConference?.on(
            JitsiEvents.conference.CONFERENCE_JOINED,
            () => {
                this._loggerHandler?.log("Joined a conference room.");
            }
        );

        JitsiMeetJS.createLocalTracks().then(
            (tracks) => {
                // Do something on local tracks.

                // Join room.
                this._jitsiConference?.join("");
                console.info(tracks);
            }
        );
    }

    private _onConnectionEstablished() {
        this.state = ConnectionStates.Connected;
        this._loggerHandler?.log("Action[changeState] will be triggered.")
        store.changeState(this.state);
    }

    private _onConnectionDisposed() {
        this.state = ConnectionStates.Disconnected;
        this._loggerHandler?.log("Action[changeState] will be triggered.")
        store.changeState(this.state);
    }
}

const connection = new Connection();
export { Connection, connection };

