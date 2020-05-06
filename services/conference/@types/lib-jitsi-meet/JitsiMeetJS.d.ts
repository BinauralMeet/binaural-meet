declare module 'JitsiMeetJS' {
    import JitsiConnection from '@libs/lib-jitsi-meet/JitsiConnection';
    import JitsiConference from "@libs/lib-jitsi-meet/JitsiConference";
    import JitsiTrack from "@libs/lib-jitsi-meet/modules/RTC/JitsiTrack";
    import { IStatisticsOptions, IRTCOptions } from "@libs/lib-jitsi-meet/module";

    export const version: string;

    interface ProxyConnectionService { }

    interface ParticipantConnectionStatus { }

    interface JitsiTranscriptionStatus { }

    interface JitsiMeetConstants {
        participantconnectionStatus: ParticipantConnectionStatus;
        recording: any;
        sipVideoGW: any;
        transcriptionStatus: JitsiTranscriptionStatus;
    }

    const constants: JitsiMeetConstants;

    interface JitsiMeetEvents {
        conference: typeof JitsiConferenceEvents;
        connection: typeof JitsiConnectionEvents;
        detection: any;
        track: any;
        mediaDevices: any;
        connectionQuality: any;
        e2eping: any;
    }

    export namespace JitsiConferenceEvents {
        export const AUDIO_INPUT_STATE_CHANGE: string;
        export const AUTH_STATUS_CHANGED: string;
        export const AVATAR_CHANGED: string;
        export const BEFORE_STATISTICS_DISPOSED: string;
        export const CONFERENCE_ERROR: string;
        export const CONFERENCE_FAILED: string;
        export const CONFERENCE_JOINED: string;
        export const CONFERENCE_LEFT: string;
        export const CONNECTION_ESTABLISHED: string;
        export const CONNECTION_INTERRUPTED: string;
        export const CONNECTION_RESTORED: string;
        export const DATA_CHANNEL_OPENED: string;
        export const DISPLAY_NAME_CHANGED: string;
        export const DOMINANT_SPEAKER_CHANGED: string;
        export const CONFERENCE_CREATED_TIMESTAMP: string;
        export const DTMF_SUPPORT_CHANGED: string;
        export const ENDPOINT_MESSAGE_RECEIVED: string;
        export const JVB121_STATUS: string;
        export const KICKED: string;
        export const PARTICIPANT_KICKED: string;
        export const LAST_N_ENDPOINTS_CHANGED: string;
        export const LOCK_STATE_CHANGED: string;
        export const SERVER_REGION_CHANGED: string;
        export const MESSAGE_RECEIVED: string;
        export const NO_AUDIO_INPUT: string;
        export const NOISY_MIC: string;
        export const PRIVATE_MESSAGE_RECEIVED: string;
        export const PARTICIPANT_CONN_STATUS_CHANGED: string;
        export const PARTCIPANT_FEATURES_CHANGED: string;
        export const PARTICIPANT_PROPERTY_CHANGED: string;
        export const P2P_STATUS: string;
        export const PHONE_NUMBER_CHANGED: string;
        export const PROPERTIES_CHANGED: string;
        export const RECORDER_STATE_CHANGED: string;
        export const VIDEO_SIP_GW_AVAILABILITY_CHANGED: string;
        export const VIDEO_SIP_GW_SESSION_STATE_CHANGED: string;
        export const START_MUTED_POLICY_CHANGED: string;
        export const STARTED_MUTED: string;
        export const SUBJECT_CHANGED: string;
        export const SUSPEND_DETECTED: string;
        export const TALK_WHILE_MUTED: string;
        export const TRACK_ADDED: string;
        export const TRACK_AUDIO_LEVEL_CHANGED: string;
        export const TRACK_MUTE_CHANGED: string;
        export const TRACK_REMOVED: string;
        export const TRANSCRIPTION_STATUS_CHANGED: string;
        export const USER_JOINED: string;
        export const USER_LEFT: string;
        export const USER_ROLE_CHANGED: string;
        export const USER_STATUS_CHANGED: string;
        export const BOT_TYPE_CHANGED: string;
    }

    export namespace JitsiConnectionEvents {
        export const CONNECTION_DISCONNECTED: string;
        export const CONNECTION_ESTABLISHED: string;
        export const CONNECTION_FAILED: string;
        export const WRONG_STATE: string;
    }

    export const events: JitsiMeetEvents;

    interface JitsiMeetErrors {
        conference: any;
        connection: any;
        track: any;
    }

    const errors: JitsiMeetErrors;

    interface IJitsiMeetJSOptions {
        useIPv6: boolean;
        desktopSharingChromeExtId: boolean;
        desktopSharingChromeDisabled: boolean;
        desktopSharingChromeSources: Array<string>;
        desktopSharingChromeMinExtVersion: string;
        desktopSharingFirefoxDisabled: boolean;
        disableAudioLevels: boolean;
        disableSimulcast: boolean;
        enableWindowOnErrorHandler: boolean;
        disableThiredPartyRequests: boolean;
        enableAnalyticsLogging: boolean;
        callStatsCustionScriptUrl?: string;
        callStatsConfIDNamespace?: string;
        disableRtx?: boolean;
        disableH264?: boolean;
        preferH264?: boolean;
    }

    interface JitsiTrackOptions {
        devices: Array<string>;
        resolution: string;
        constraints: any;
        cameraDeviceId: string;
        micDeviceId: string;
        minFps: string;
        maxFps: string;
        facingMode: 'user' | 'environment'
    }

    function init(options?: IJitsiMeetJSOptions): void;
    function setLogLevel(level: any): void;
    function createLocalTracks(options?: JitsiTrackOptions, firePermissionPromptIsShownEvent?: boolean): Promise<Array<JitsiTrack>>;

    export { JitsiConnection, JitsiConference, init, setLogLevel, createLocalTracks };

}
