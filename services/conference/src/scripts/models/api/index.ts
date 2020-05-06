import { JitsiMeetJS } from "@libs/lib-jitsi-meet";
import { EventEmitter } from "events";

const JitsiEvents = JitsiMeetJS.events;
console.log(`JitsiMeetJS Version: ${JitsiMeetJS.version}`);

class Connection extends EventEmitter {
    static createConnection(): Connection {
        return new Connection();
    }

    private _jitsiConnection?: JitsiMeetJS.JitsiConnection;
    private _jitsiConference?: JitsiMeetJS.JitsiConference;

    constructor(useJitsiMeet: boolean = true) {
        super();
        if (useJitsiMeet) {
            this._initJitsiConnection().then(
                () => {
                    this._initJitsiConference();
                }
            )
        }

    }

    private _initJitsiConnection(): Promise<void> {
        return new Promise(
            (resolve, reject) => {
                JitsiMeetJS.init();

                this._jitsiConnection = new JitsiMeetJS.JitsiConnection("test", "", {});

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

export { Connection }
