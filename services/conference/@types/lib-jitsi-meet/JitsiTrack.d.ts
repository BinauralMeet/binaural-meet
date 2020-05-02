// Type definitions for [~THE LIBRARY NAME~] [~OPTIONAL VERSION NUMBER~]
// Project: [~THE PROJECT NAME~]
// Definitions by: [~YOUR NAME~] <[~A URL FOR YOU~]>

declare module '@libs/lib-jitsi-meet/JitsiTrack' {
    import { EventEmitter } from "events";

    interface MediaType {
        AUDIO: 'audio';
        PRESENTER: 'presenter';
        VIDEO: 'video';
    }

    interface TrackInfo {
        deviceId: number;
        facingMode: any;
        mediaType: MediaType;
        resolution: any;
        rtcId: number;
        sourceId: any;
        sourceType: any;
        stream: MediaStream;
        track: any;
        videoType: any;
        effects: Object;
    }

    class JitsiTrack extends EventEmitter {
        constructor(
            conference: Object,
            stream: MediaStream,
            track: MediaStreamTrack,
            streamInactiveHandler: Function,
            trackMediaType: MediaType,
            videoType: string,
        );
    }

    class JitsiLocalTrack extends JitsiTrack {
        constructor(trackInfo: TrackInfo);
    }

    export { MediaType, TrackInfo, JitsiLocalTrack };
    export default JitsiTrack;
}
