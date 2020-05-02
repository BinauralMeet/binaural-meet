// Type definitions for [~THE LIBRARY NAME~] [~OPTIONAL VERSION NUMBER~]
// Project: [~THE PROJECT NAME~]
// Definitions by: [~YOUR NAME~] <[~A URL FOR YOU~]>

declare module '@libs/lib-jitsi-meet/JitsiParticipant' {
    import JitsiConference from "@libs/lib-jitsi-meet/JitsiConference";

    class JitsiParticipant {
        constructor(
            jid: string,
            conference: JitsiConference,
            displayName: string,
            hidden: boolean,
            statsID: string,
            status: any,
            identity: Object,
        );
    }

    export default JitsiParticipant;
}

