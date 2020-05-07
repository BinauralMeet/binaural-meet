import JitsiMeetJS from "@libs/lib-jitsi-meet";
import { EventEmitter } from "events";

const JitsiEvents = JitsiMeetJS.events;
console.log(`JitsiMeetJS Version: ${JitsiMeetJS.version}`);

const options = {
    hosts: {
        domain: 'jitsi-meet.example.com',
        muc: 'conference.jitsi-meet.example.com' // FIXME: use XEP-0030
    },
    bosh: '//jitsi-meet.example.com/http-bind', // FIXME: use xep-0156 for that

    // The name of client node advertised in XEP-0115 'c' stanza
    clientNode: 'http://jitsi.org/jitsimeet'
};

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

class Connection extends EventEmitter {
    static createConnection(): Connection {
        return new Connection();
    }

    private _jitsiConnection?: JitsiMeetJS.JitsiConnection;
    private _jitsiConference?: JitsiMeetJS.JitsiConference;

    constructor() {
        super();
    }

    public init(): Promise<string> {
        console.log("Start initialization.");
        return this._initJitsiConnection().then(
            () => {
                this._initJitsiConference();
                return Promise.resolve("Successed.");
            }
        )
    }


    private _initJitsiConnection(): Promise<void> {
        return new Promise(
            (resolve, reject) => {
                JitsiMeetJS.init(initOptions);

                this._jitsiConnection = new JitsiMeetJS.JitsiConnection("test", "", options);

                this._jitsiConnection.addEventListener(
                    JitsiEvents.connection.CONNECTION_ESTABLISHED,
                    () => {
                        console.log("Connection has been established.");
                        resolve();
                    }
                );
                this._jitsiConnection.addEventListener(
                    JitsiEvents.connection.CONNECTION_FAILED,
                    () => {
                        console.log("Failed to connect.");
                        reject();
                    }
                );
                this._jitsiConnection.addEventListener(
                    JitsiEvents.connection.CONNECTION_DISCONNECTED,
                    () => {
                        console.log("Disconnected from remote server.");
                    }
                );

                this._jitsiConnection.connect();
            }
        );
    }

    private _initJitsiConference() {
        this._jitsiConference = this._jitsiConnection?.initJitsiConference("conference1", {});

        this._jitsiConference?.on(
            (JitsiEvents.conference.TRACK_ADDED),
            () => {
                console.log("Joined a conference room.");
            }
        );
        this._jitsiConference?.on(
            JitsiEvents.conference.CONFERENCE_JOINED,
            () => {
                console.log("Joined a conference room.");
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
}

export { Connection };
